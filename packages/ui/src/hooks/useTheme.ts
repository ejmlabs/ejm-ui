import type { ResolvedTheme, ThemeChoice } from '@ejm/core';
import { useCallback, useSyncExternalStore } from 'react';
import { browserThemeEnv, createThemeStore, SERVER_THEME, type ThemeStore } from './theme-store';

export interface Theme {
  /** What the visitor picked. "system" means nothing is saved and the OS decides. */
  choice: ThemeChoice;
  /** What is on screen: always light or dark. */
  resolved: ResolvedTheme;
  setChoice(choice: ThemeChoice): void;
  /** Switch to the other of light and dark, and save it. */
  toggle(): void;
}

let shared: ThemeStore | undefined;
const browserStore = () => (shared ??= createThemeStore(browserThemeEnv()));

/**
 * Light, dark or system. Saves to the ejm-theme cookie on ejmlabs.com and its subdomains (localStorage elsewhere), sets
 * data-theme on <html>, and follows the OS until a choice is saved. The server and hydration render
 * { choice: "system", resolved: "light" }; the real value follows in the next render, so markup never mismatches.
 * Do not branch on `resolved` for anything visible before hydration: use the `dark:` variant instead.
 */
export function useTheme(store?: ThemeStore): Theme {
  // browserStore() reads window, so it is only ever called from these client-only callbacks, never during render.
  const subscribe = useCallback((l: () => void) => (store ?? browserStore()).subscribe(l), [store]);
  const getSnapshot = useCallback(() => (store ?? browserStore()).getSnapshot(), [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_THEME);
  const set = (c: ThemeChoice) => (store ?? browserStore()).setChoice(c);
  return { ...snapshot, setChoice: set, toggle: () => set(snapshot.resolved === 'dark' ? 'light' : 'dark') };
}
