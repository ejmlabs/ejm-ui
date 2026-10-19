export const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

/** Cookie shared by every ejmlabs.com site. It holds light or dark only; system means no cookie. */
export const THEME_COOKIE_NAME = "ejm-theme";
export const THEME_COOKIE_DOMAIN = ".ejmlabs.com";
export const THEME_COOKIE_MAX_AGE = 31536000;

/** Anything that is not light or dark is system. */
export const parseThemeChoice = (value: unknown): ThemeChoice => (value === "light" || value === "dark" ? value : "system");

export const resolveTheme = (choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme =>
  choice === "system" ? (systemPrefersDark ? "dark" : "light") : choice;

/** Attributes for the root element. data-theme is always light or dark, so CSS never sees "system". */
export const themeAttributes = (choice: ThemeChoice, systemPrefersDark: boolean) =>
  ({ "data-theme": resolveTheme(choice, systemPrefersDark), "data-theme-choice": choice }) as const;

/** Toggle order: light, dark, system, then back to light. */
export const nextThemeChoice = (choice: ThemeChoice): ThemeChoice => THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length]!;

/** The cookie string for a choice. System clears the cookie. */
export function themeCookie(choice: ThemeChoice, opts: { secure?: boolean } = {}): string {
  const base = `${THEME_COOKIE_NAME}=${choice === "system" ? "" : choice}; Domain=${THEME_COOKIE_DOMAIN}; Path=/; SameSite=Lax`;
  const age = choice === "system" ? 0 : THEME_COOKIE_MAX_AGE;
  return `${base}; Max-Age=${age}${opts.secure ? "; Secure" : ""}`;
}
