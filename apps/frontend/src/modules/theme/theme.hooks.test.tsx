// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setThemePreference, useTheme } from './theme.hooks';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useTheme', () => {
  it('reads back the chosen preference', () => {
    const { result } = renderHook(() => useTheme());

    act(() => setThemePreference('dark'));

    expect(result.current).toEqual({ preference: 'dark', resolved: 'dark' });
  });

  it('falls back to the system theme when site data is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    const { result } = renderHook(() => useTheme());
    act(() => setThemePreference('dark'));

    expect(result.current).toEqual({ preference: 'system', resolved: 'light' });
  });
});
