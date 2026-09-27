import { useEffect, useSyncExternalStore } from 'react';

import * as Result from 'effect/Result';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'visit-pass:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

/** The stored preference, or 'system' when site data is blocked. */
function readPreference(): ThemePreference {
  const stored = Result.getOrNull(
    Result.try(() => window.localStorage.getItem(STORAGE_KEY))
  );
  const isKnown =
    stored === 'light' || stored === 'dark' || stored === 'system';

  return isKnown ? stored : 'system';
}

function subscribe(listener: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  listeners.add(listener);
  media.addEventListener('change', listener);

  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
  };
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference;

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Stores the preference; a no-op when site data is blocked. */
export function setThemePreference(preference: ThemePreference) {
  const stored = Result.try(() =>
    window.localStorage.setItem(STORAGE_KEY, preference)
  );
  if (Result.isFailure(stored)) return;

  listeners.forEach((listener) => listener());
}

/** The stored preference and the theme it resolves to right now. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference);
  const resolved = useSyncExternalStore(subscribe, () => resolve(preference));

  return { preference, resolved };
}

/** Mount once at the root: mirrors the resolved theme onto `<html class>`. */
export function useApplyTheme() {
  const { resolved } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  return resolved;
}
