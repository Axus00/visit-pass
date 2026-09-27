import { useEffect, useState } from 'react';

/**
 * The current time, rounded down to `intervalMs` and updated on each
 * `intervalMs` boundary of the clock. Queries take `now` as an argument instead
 * of reading the clock, so the rounding keeps their arguments (and
 * subscriptions) stable between ticks, and following the clock's boundaries
 * keeps `now` at most one rounding step behind real time.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => roundDown(Date.now(), intervalMs));

  useEffect(() => {
    // Each tick schedules the next boundary afresh, so a late or throttled
    // timer realigns instead of drifting like a fixed interval would.
    let timer: number | undefined;

    const scheduleNextTick = () => {
      const untilNextBoundary = intervalMs - (Date.now() % intervalMs);

      timer = window.setTimeout(() => {
        setNow(roundDown(Date.now(), intervalMs));
        scheduleNextTick();
      }, untilNextBoundary);
    };

    scheduleNextTick();

    return () => window.clearTimeout(timer);
  }, [intervalMs]);

  return now;
}

function roundDown(value: number, step: number) {
  return value - (value % step);
}
