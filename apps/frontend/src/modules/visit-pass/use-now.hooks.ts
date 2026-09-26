import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `intervalMs`. Queries take `now` as an
 * argument instead of reading the clock, so round it to keep their arguments
 * (and subscriptions) stable between ticks.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => roundDown(Date.now(), intervalMs));

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(roundDown(Date.now(), intervalMs)),
      intervalMs
    );

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function roundDown(value: number, step: number) {
  return value - (value % step);
}
