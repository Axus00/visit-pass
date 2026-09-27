import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type * as Domain from '../domain';

/**
 * Delivers a Reporte de turno to the unit's Administradores. `notConfigured`
 * means the deployment has no email provider, which is not a failure: the file
 * stays downloadable.
 */
export class ShiftReportMailer extends Context.Service<
  ShiftReportMailer,
  {
    readonly send: (args: {
      readonly to: ReadonlyArray<string>;
      readonly subject: string;
      readonly text: string;
      readonly attachment: {
        readonly fileName: string;
        readonly content: Uint8Array;
      };
      /** Stable across retries so the provider sends the email once. */
      readonly idempotencyKey: string;
    }) => Effect.Effect<'sent' | 'notConfigured', Domain.ShiftReportEmailError>;
  }
>()(
  '@repo/backend/confect/modules/shiftReports/application/ShiftReportMailer'
) {}
