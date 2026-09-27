import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';
import * as MembershipsApplication from '../../memberships/application';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';
import { requireReportableShift } from './queries';

/** Administradores are a handful per unit; this bounds a misconfigured one. */
const ADMINISTRATORS_PER_UNIT_LIMIT = 100;

/**
 * Inserts a `generating` report for a started Turno the caller may report on. The
 * caller starts its workflow. With `sendEmail`, the email is `pending`, and the
 * request fails with `noRecipients` when no active Administrador can receive it.
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

    if (shift.status === 'scheduled')
      return yield* new Domain.ShiftReportNotAllowedError({
        reason: 'shiftNotStarted',
      });

    const [unit, recipients] = yield* Effect.all(
      [
        reader
          .table('residentialUnits')
          .get(shift.residentialUnitId)
          .pipe(Effect.orDie),
        // Emails of the unit's active Administradores: the linked Usuario's
        // current email, or the invited email while none is linked. An
        // Administrador whose Usuario was deleted receives nothing.
        args.sendEmail
          ? Effect.gen(function* () {
              const administrators = yield* reader
                .table('memberships')
                .index('by_residentialUnitId_and_role', (q) =>
                  q
                    .eq('residentialUnitId', shift.residentialUnitId)
                    .eq('role', 'administrator')
                )
                .take(ADMINISTRATORS_PER_UNIT_LIMIT)
                .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

              const emails = yield* Effect.forEach(
                administrators.filter(
                  (administrator) => administrator.status === 'active'
                ),
                (administrator) =>
                  Effect.gen(function* () {
                    if (Predicate.isUndefined(administrator.userId))
                      return administrator.email;

                    const user = yield* UsersApplication.getOneById(
                      administrator.userId
                    ).pipe(UsersDomain.isActiveOrNull);

                    return user?.email ?? null;
                  }),
                { concurrency: 'unbounded' }
              );

              return [...new Set(emails.filter(Predicate.isNotNull))];
            })
          : Effect.succeed([]),
      ],
      { concurrency: 'unbounded' }
    );

    const hasNoRecipients = args.sendEmail && recipients.length === 0;

    if (hasNoRecipients)
      return yield* new Domain.ShiftReportNotAllowedError({
        reason: 'noRecipients',
      });

    return yield* writer
      .table('shiftReports')
      .insert({
        residentialUnitId: shift.residentialUnitId,
        shiftId: shift._id,
        requestedByMembershipId: membership._id,
        fileName: Domain.toShiftReportFileName({
          residentialUnitName: unit.name,
          shiftStart:
            shift.startedAt ?? shift.plannedStart ?? shift._creationTime,
          timeZone: unit.timeZone,
        }),
        status: 'generating',
        emailStatus: args.sendEmail ? 'pending' : 'notRequested',
        recipients,
      })
      .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));
  }
);
