import * as CalendarShared from '@repo/backend/shared/calendar';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The instant a wall-clock `YYYY-MM-DD` + `HH:mm` names in `timeZone`. Times
 * repeated when clocks go back resolve to the earlier one; times skipped when
 * they go forward move ahead by the gap, as `Temporal`'s `compatible` mode does.
 * Colombia has no daylight saving, so there both cases never happen.
 */
export function zonedDateTimeToEpoch(args: {
  readonly localDate: string;
  readonly localTime: string;
  readonly timeZone: string;
}) {
  const [year = 0, month = 1, day = 1] = args.localDate.split('-').map(Number);
  const [hour = 0, minute = 0] = args.localTime.split(':').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const wallClock = new Intl.DateTimeFormat('en-US', {
    timeZone: args.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  // The wall-clock reading of an instant in `timeZone`, re-read as if it were UTC.
  const wallClockAsUtc = (epochMillis: number) => {
    const parts = wallClock.formatToParts(epochMillis);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((candidate) => candidate.type === type)?.value ?? 0);

    return Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second')
    );
  };

  // Zones change offset at most once a day, so the offsets a day either side
  // (how far `timeZone` is ahead of UTC then) are the only ones this wall-clock
  // time can be read with.
  const [offsetBefore = 0, offsetAfter = 0] = [
    asUtc - MILLIS_PER_DAY,
    asUtc + MILLIS_PER_DAY,
  ].map((instant) => wallClockAsUtc(instant) - instant);
  const matches = [asUtc - offsetBefore, asUtc - offsetAfter].filter(
    (candidate) => wallClockAsUtc(candidate) === asUtc
  );

  return matches.length > 0 ? Math.min(...matches) : asUtc - offsetBefore;
}

/**
 * The planned window of a Turno typed as a date plus start and end times. An
 * end at or before the start means the Turno ends the next day (a night shift
 * `18:00`–`06:00`).
 */
export function toShiftWindow(args: {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly timeZone: string;
}) {
  const endsNextDay = args.endTime <= args.startTime;
  const endDate = endsNextDay
    ? CalendarShared.addDays(args.date, 1)
    : args.date;

  return {
    plannedStart: zonedDateTimeToEpoch({
      localDate: args.date,
      localTime: args.startTime,
      timeZone: args.timeZone,
    }),
    plannedEnd: zonedDateTimeToEpoch({
      localDate: endDate,
      localTime: args.endTime,
      timeZone: args.timeZone,
    }),
    endsNextDay,
  };
}
