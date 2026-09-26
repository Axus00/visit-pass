import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { env } from '#convex/_generated/server';

import * as CommonErrorsDomain from '../../commonErrors/domain';
import * as Application from '../application';
import * as Domain from '../domain';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/** Resend accepts at most this many addresses in `to`. */
const MAX_RECIPIENTS = 50;

/** Keeps `String.fromCharCode` below the engine's argument limit. */
const BASE64_CHUNK_SIZE = 0x8000;

/** The subset of Resend's `POST /emails` body this mailer sends. */
const ResendEmailRequestJson = Schema.fromJsonString(
  Schema.Struct({
    from: Schema.String,
    to: Schema.Array(Schema.String),
    subject: Schema.String,
    text: Schema.String,
    attachments: Schema.Array(
      Schema.Struct({ filename: Schema.String, content: Schema.String })
    ),
  })
);

function toBase64(bytes: Uint8Array) {
  const chunkCount = Math.ceil(bytes.length / BASE64_CHUNK_SIZE);
  const binary = Array.from({ length: chunkCount }, (_, index) =>
    String.fromCharCode(
      ...bytes.subarray(
        index * BASE64_CHUNK_SIZE,
        (index + 1) * BASE64_CHUNK_SIZE
      )
    )
  ).join('');

  return btoa(binary);
}

/**
 * Sends through Resend's REST API, because `@convex-dev/resend` cannot attach
 * files. Reads `RESEND_API_KEY` and `SHIFT_REPORT_FROM_EMAIL` per call and
 * answers `notConfigured` without either.
 */
export const resendShiftReportMailerLayer = Layer.succeed(
  Application.ShiftReportMailer,
  Application.ShiftReportMailer.of({
    send: Effect.fn('ResendShiftReportMailer.send')(function* (args) {
      const apiKey = env.RESEND_API_KEY?.trim() ?? '';
      const from = env.SHIFT_REPORT_FROM_EMAIL?.trim() ?? '';

      const isConfigured = apiKey.length > 0 && from.length > 0;

      if (!isConfigured) return 'notConfigured' as const;

      const body = yield* Schema.encodeEffect(ResendEmailRequestJson)({
        from,
        to: args.to.slice(0, MAX_RECIPIENTS),
        subject: args.subject,
        text: args.text,
        attachments: [
          {
            filename: args.attachment.fileName,
            content: toBase64(args.attachment.content),
          },
        ],
      }).pipe(Effect.orDie);

      const response = yield* Effect.tryPromise({
        try: () =>
          // oxlint-disable-next-line effecttsgo/global-fetch-in-effect -- Convex's default runtime documents `fetch`; Effect's FetchHttpClient also needs AbortController and timers.
          fetch(RESEND_EMAILS_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': args.idempotencyKey,
            },
            body,
          }),
        catch: (error) =>
          new Domain.ShiftReportEmailError({
            status: 0,
            detail: CommonErrorsDomain.stringifyUnknownError(error),
          }),
      });

      if (response.ok) return 'sent' as const;

      const detail = yield* Effect.tryPromise(() => response.text()).pipe(
        Effect.orElseSucceed(() => response.statusText)
      );

      return yield* new Domain.ShiftReportEmailError({
        status: response.status,
        detail,
      });
    }),
  })
);
