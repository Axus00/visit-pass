import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import type { ShiftsDoc } from '../../../_generated/docs';
import { DatabaseReader } from '../../../_generated/services';
import * as Domain from '../domain';
import { loadMemberNames } from './memberNames';

/** The Portero Membresía's open Turno, or null when it has none. */
export const findOpenShift = Effect.fn('Shifts.findOpenShift')(function* (
  porterMembershipId: Id<'memberships'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('shifts')
    .index('by_porterMembershipId_and_status_and_plannedEnd', (q) =>
      q.eq('porterMembershipId', porterMembershipId).eq('status', 'open')
    )
    .first()
    .pipe(
      Effect.map(Option.getOrNull),
      Effect.catchTag('DocumentDecodeError', Effect.die)
    );
});

/** Loads a Turno of the unit; other units' Turnos are reported as not found. */
export const getShiftInUnit = Effect.fn('Shifts.getShiftInUnit')(function* (
  shiftId: Id<'shifts'>,
  residentialUnitId: Id<'residentialUnits'>
) {
  const reader = yield* DatabaseReader;

  const shift = yield* reader
    .table('shifts')
    .get(shiftId)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );

  const isInUnit =
    Predicate.isNotNull(shift) && shift.residentialUnitId === residentialUnitId;
  if (!isInUnit) return yield* new Domain.ShiftNotFoundError();

  return shift;
});

export const toShiftSummaries = Effect.fn('Shifts.toShiftSummaries')(function* (
  shifts: ReadonlyArray<ShiftsDoc>
) {
  const porterNames = yield* loadMemberNames(
    shifts.map((shift) => shift.porterMembershipId)
  );

  return shifts.map((shift): Domain.ShiftSummary => ({
    _id: shift._id,
    porterMembershipId: shift.porterMembershipId,
    porterName: porterNames.get(shift.porterMembershipId) ?? '',
    status: shift.status,
    plannedStart: shift.plannedStart,
    plannedEnd: shift.plannedEnd,
    startedAt: shift.startedAt,
    endedAt: shift.endedAt,
    closedByAdministrator: Predicate.isNotUndefined(shift.closedByMembershipId),
  }));
});
