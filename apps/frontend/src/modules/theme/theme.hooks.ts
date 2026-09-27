import { useEffect, useSyncExternalStore } from 'react';

import * as Result from 'effect/Result';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'visit-pass:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
/** The last preference chosen in this tab; outlives a blocked storage write. */
let sessionPreference: ThemePreference = 'system';

/** The stored preference, or this tab's choice when site data is blocked. */
function readPreference(): ThemePreference {
  const stored = Result.getOrNull(
    Result.try(() => window.localStorage.getItem(STORAGE_KEY))
  );
  const isKnown =
    stored === 'light' || stored === 'dark' || stored === 'system';

  return isKnown ? stored : sessionPreference;
}

function subscribe(listener: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  listeners.add(listener);
  media.addEventListener('change', listener);
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
    window.removeEventListener('storage', onStorage);
  };
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference;

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Applies the preference in this tab and stores it when site data allows. */
export function setThemePreference(preference: ThemePreference) {
  sessionPreference = preference;
  Result.try(() => window.localStorage.setItem(STORAGE_KEY, preference));

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
