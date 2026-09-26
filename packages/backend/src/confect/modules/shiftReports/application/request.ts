import * as Effect from 'effect/Effect';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';
import * as MembershipsApplication from '../../memberships/application';
import * as Domain from '../domain';
import { listAdministratorEmails, requireReportableShift } from './queries';

/**
 * Inserts a `generating` report for a Turno the caller may report on. The
 * caller starts its workflow; the email is only `pending` when the unit has an
 * active Administrador to receive it.
 */
export const requestShiftReport = Effect.fn('ShiftReports.requestShiftReport')(
  function* (args: {
    readonly membershipId: Id<'memberships'>;
    readonly shiftId: Id<'shifts'>;
    readonly sendEmail: boolean;
  }) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;

    const { membership } = yield* MembershipsApplication.requireMembership(
      args.membershipId,
      ['porter', 'administrator']
    );

    const shift = yield* requireReportableShift({
      membership,
      shiftId: args.shiftId,
    });

    const [unit, recipients] = yield* Effect.all(
      [
        reader
          .table('residentialUnits')
          .get(shift.residentialUnitId)
          .pipe(Effect.orDie),
        args.sendEmail
          ? listAdministratorEmails(shift.residentialUnitId)
          : Effect.succeed([]),
      ],
      { concurrency: 'unbounded' }
    );

    const isEmailDeliverable = args.sendEmail && recipients.length > 0;

    return yield* writer
      .table('shiftReports')
      .insert({
        residentialUnitId: shift.residentialUnitId,
        shiftId: shift._id,
        requestedByMembershipId: membership._id,
        fileName: Domain.toShiftReportFileName({
          residentialUnitName: unit.name,
          shiftStart: Domain.toShiftStart(shift),
          timeZone: unit.timeZone,
        }),
        status: 'generating',
        emailStatus: isEmailDeliverable ? 'pending' : 'notRequested',
        recipients: isEmailDeliverable ? recipients : [],
      })
      .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));
  }
);
