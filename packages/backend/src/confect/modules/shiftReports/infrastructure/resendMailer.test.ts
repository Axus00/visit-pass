import { afterEach, beforeEach, describe, it, vi } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Application from '../application';
import { resendShiftReportMailerLayer } from './resendMailer';

const RequestBodyJson = Schema.fromJsonString(
  Schema.Struct({ to: Schema.Array(Schema.String) })
);

const recipients = (count: number) =>
  Array.from({ length: count }, (_, index) => `admin${index}@example.com`);

const send = (to: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const mailer = yield* Application.ShiftReportMailer;

    return yield* mailer.send({
      to,
      subject: 'Reporte de turno',
      text: 'Adjunto el reporte.',
      attachment: {
        fileName: 'reporte.xlsx',
        content: new Uint8Array([1, 2, 3]),
      },
      idempotencyKey: 'shift-report/1',
    });
  }).pipe(Effect.provide(resendShiftReportMailerLayer));

/** Answers every Resend request with `status` and returns the spy. */
const stubFetch = (status: number) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() =>
      Promise.resolve(new Response('resend says no', { status }))
    );

/** The `to` list and Idempotency-Key of every request, in order. */
const sentRequests = (fetchSpy: ReturnType<typeof stubFetch>) =>
  Effect.forEach(fetchSpy.mock.calls, ([, init]) =>
    Schema.decodeUnknownEffect(RequestBodyJson)(init?.body).pipe(
      Effect.map((body) => ({
        to: body.to,
        idempotencyKey: new Headers(init?.headers).get('Idempotency-Key'),
      })),
      Effect.orDie
    )
  );

describe('resendShiftReportMailerLayer', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('SHIFT_REPORT_FROM_EMAIL', 'reportes@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.effect('sends one request for a small unit', () =>
    Effect.gen(function* () {
      const fetchSpy = stubFetch(200);

      const result = yield* send(recipients(3));

      EffectVitestUtils.strictEqual(result, 'sent');
      EffectVitestUtils.deepStrictEqual(yield* sentRequests(fetchSpy), [
        { to: recipients(3), idempotencyKey: 'shift-report/1/recipients-0' },
      ]);
    })
  );

  it.effect(
    'splits recipients into requests of at most 50, each with its own idempotency key',
    () =>
      Effect.gen(function* () {
        const fetchSpy = stubFetch(200);
        const to = recipients(101);

        yield* send(to);

        const requests = yield* sentRequests(fetchSpy);
        EffectVitestUtils.deepStrictEqual(
          requests.map((request) => request.to.length),
          [50, 50, 1]
        );
        EffectVitestUtils.deepStrictEqual(
          requests.flatMap((request) => request.to),
          to
        );
        EffectVitestUtils.deepStrictEqual(
          requests.map((request) => request.idempotencyKey),
          [
            'shift-report/1/recipients-0',
            'shift-report/1/recipients-1',
            'shift-report/1/recipients-2',
          ]
        );
      })
  );

  it.effect('fails with the status Resend rejects a request with', () =>
    Effect.gen(function* () {
      const fetchSpy = stubFetch(422);

      const error = yield* Effect.flip(send(recipients(51)));

      EffectVitestUtils.strictEqual(error.status, 422);
      EffectVitestUtils.strictEqual(error.detail, 'resend says no');
      EffectVitestUtils.strictEqual(fetchSpy.mock.calls.length, 1);
    })
  );

  it.effect('answers notConfigured without an API key', () =>
    Effect.gen(function* () {
      vi.stubEnv('RESEND_API_KEY', '');
      const fetchSpy = stubFetch(200);

      const result = yield* send(recipients(3));

      EffectVitestUtils.strictEqual(result, 'notConfigured');
      EffectVitestUtils.strictEqual(fetchSpy.mock.calls.length, 0);
    })
  );
});
