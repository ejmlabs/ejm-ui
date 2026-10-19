export const tokensVersion = "0.1.0";

/** The full-bleed tonal bands. Set one with data-band on a section; see packages/ui/THEME.md. */
export const BANDS = ["paper", "mist", "sage", "ink"] as const;
export type Band = (typeof BANDS)[number];

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** The six chart hue roles, as Tailwind color names (bg-hue-1 ... bg-hue-6). */
export const HUES = ["hue-1", "hue-2", "hue-3", "hue-4", "hue-5", "hue-6"] as const;

/** Cookie that stores the visitor's theme, shared by every ejmlabs.com site. theme-boot.js reads it; the theme hook writes it. */
export const THEME_COOKIE = {
  name: "ejm-theme",
  domain: ".ejmlabs.com",
  path: "/",
  maxAge: 31536000,
  sameSite: "Lax",
  /** Add "; Secure" when location.protocol is https:. Outside ejmlabs.com hosts the choice goes in localStorage under the same name. */
  secureOnHttps: true,
} as const;
