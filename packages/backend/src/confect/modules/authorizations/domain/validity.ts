import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import * as CalendarDomain from '../../calendar/domain';
import { ALL_WEEKDAYS } from './admission';
import type { InvalidAuthorizationReason } from './errors';
import type { CreateAuthorizationDto } from './models';
import { MAX_SERVICE_DAYS } from './models';

export type AuthorizationValidity = {
  readonly startDate: CalendarDomain.LocalDate;
  readonly endDate: CalendarDomain.LocalDate;
  readonly weekdays: ReadonlyArray<CalendarDomain.Weekday>;
};

/**
 * Resolves the days a new Autorización is valid on, or why it cannot be
 * created. `today` is the calendar day in the unit's time zone. Temporal and
 * Evento cover `startDate` only; Servicio covers its range on the chosen
 * weekdays, deduplicated and sorted.
 */
export function resolveAuthorizationValidity(
  dto: Pick<
    CreateAuthorizationDto,
    'type' | 'startDate' | 'endDate' | 'weekdays' | 'visitors'
  >,
  today: CalendarDomain.LocalDate
): Result.Result<AuthorizationValidity, InvalidAuthorizationReason> {
  if (dto.startDate < today) return Result.fail('startsInThePast');

  const needsSingleVisitor = dto.type !== 'event' && dto.visitors.length !== 1;
  if (needsSingleVisitor) return Result.fail('singleVisitorRequired');

  if (dto.type !== 'service')
    return Result.succeed({
      startDate: dto.startDate,
      endDate: dto.startDate,
      weekdays: ALL_WEEKDAYS,
    });

  if (Predicate.isUndefined(dto.endDate)) return Result.fail('missingEndDate');

  if (dto.endDate < dto.startDate) return Result.fail('endBeforeStart');

  const spannedDays =
    CalendarDomain.daysBetween(dto.startDate, dto.endDate) + 1;
  if (spannedDays > MAX_SERVICE_DAYS) return Result.fail('rangeTooLong');

  const weekdays = [...new Set(dto.weekdays ?? [])].sort((a, b) => a - b);
  if (weekdays.length === 0) return Result.fail('missingWeekdays');

  return Result.succeed({
    startDate: dto.startDate,
    endDate: dto.endDate,
    weekdays,
  });
}
