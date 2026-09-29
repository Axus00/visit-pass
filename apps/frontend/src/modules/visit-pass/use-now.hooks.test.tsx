// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNow } from './use-now.hooks';

const MINUTE = 60_000;
const TEN_AM = Date.UTC(2026, 8, 27, 10, 0);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useNow', () => {
  it('starts rounded down to the interval', () => {
    vi.setSystemTime(TEN_AM + 30_000);

    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(TEN_AM);
  });

  it('ticks on the next clock boundary, not a full interval after mount', () => {
    vi.setSystemTime(TEN_AM + 50_000);
    const { result } = renderHook(() => useNow());

    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(result.current).toBe(TEN_AM);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(TEN_AM + MINUTE);

    act(() => {
      vi.advanceTimersByTime(MINUTE);
    });
    expect(result.current).toBe(TEN_AM + 2 * MINUTE);
  });

  it('realigns to the boundary after a late tick', () => {
    vi.setSystemTime(TEN_AM);
    const { result } = renderHook(() => useNow());

    // The clock jumps ahead, as when a sleeping device wakes up.
    vi.setSystemTime(TEN_AM + 5 * MINUTE + 45_000);
    act(() => {
      vi.advanceTimersByTime(MINUTE);
    });
    expect(result.current).toBe(TEN_AM + 6 * MINUTE);

    act(() => {
      vi.advanceTimersByTime(14_999);
    });
    expect(result.current).toBe(TEN_AM + 6 * MINUTE);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(TEN_AM + 7 * MINUTE);
  });

  it('stops ticking once unmounted', () => {
    vi.setSystemTime(TEN_AM + 30_000);
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
