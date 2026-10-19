import { createContext, useContext } from "react";
import themeJson from "@ejm/tokens/theme.json";

/** none: no ANSI at all. basic: 16 named colors. 256: xterm palette. truecolor: exact brand hex. */
export type ColorLevel = "none" | "basic" | "256" | "truecolor";
export type Appearance = "dark" | "light";
/** The five text roles from the terminal guide, plus info for status. Plain text has no role. */
export type Role = "accent" | "dim" | "warning" | "error" | "success" | "info";

export interface EjmTheme {
  level: ColorLevel;
  appearance: Appearance;
  /** Unicode glyphs when true, ASCII otherwise. */
  unicode: boolean;
  /** Spinners may move. False in plain mode and non-TTY output. */
  animate: boolean;
  /** An Ink color string for the role, or undefined for plain text. */
  color(role: Role | undefined): string | undefined;
  /** Pick the unicode or ascii form of a contract glyph. */
  glyph(pair: { unicode: string; ascii: string }): string;
}

const ROLE_TO_TOKEN: Record<Role, string> = {
  accent: "accent",
  dim: "text-subtle",
  warning: "warning",
  error: "error",
  success: "success",
  info: "info",
};

/** Named 16-color set from the terminal guide (BASIC_DARK and BASIC_LIGHT). */
const BASIC: Record<Appearance, Record<Role, string>> = {
  dark: { accent: "cyan", dim: "gray", warning: "yellow", error: "red", success: "green", info: "blue" },
  light: { accent: "blue", dim: "gray", warning: "magenta", error: "red", success: "green", info: "blue" },
};

/** Nearest xterm-256 index for a hex color: gray ramp for grays, 6x6x6 cube otherwise. */
export function toAnsi256(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  if (Math.max(r, g, b) - Math.min(r, g, b) < 8) {
    const gray = Math.round(((r + g + b) / 3 - 8) / 10);
    return gray < 0 ? 16 : gray > 23 ? 231 : 232 + gray;
  }
  const c = (v: number) => Math.round((v / 255) * 5);
  return 16 + 36 * c(r) + 6 * c(g) + c(b);
}

export function createTheme(opts: { level: ColorLevel; appearance?: Appearance; unicode?: boolean; animate?: boolean }): EjmTheme {
  const appearance = opts.appearance ?? "dark";
  const roles = themeJson.themes[appearance].roles as Record<string, string>;
  return {
    level: opts.level,
    appearance,
    unicode: opts.unicode ?? true,
    animate: opts.animate ?? false,
    color(role) {
      if (!role || opts.level === "none") return undefined;
      if (opts.level === "basic") return BASIC[appearance][role];
      const hex = `#${roles[ROLE_TO_TOKEN[role]]}`;
      return opts.level === "truecolor" ? hex : `ansi256(${toAnsi256(hex)})`;
    },
    glyph: (pair) => (opts.unicode ?? true ? pair.unicode : pair.ascii),
  };
}

type Env = Record<string, string | undefined>;

/**
 * Choose the theme from the environment, in this order: NO_COLOR, non-TTY and TERM=dumb give no
 * color; FORCE_COLOR picks a level; COLORTERM picks truecolor; TERM with 256color picks 256;
 * anything else is basic. Plain mode (non-TTY, EJM_PLAIN, or a non-UTF-8 locale) uses ASCII glyphs
 * and no animation. Appearance comes from EJM_APPEARANCE, then COLORFGBG, and defaults to dark.
 */
export function detectTheme(opts: { env?: Env; isTTY?: boolean; plain?: boolean; appearance?: Appearance } = {}): EjmTheme {
  const env = opts.env ?? process.env;
  const isTTY = opts.isTTY ?? Boolean(process.stdout.isTTY);
  const plain = opts.plain ?? (!isTTY || Boolean(env.EJM_PLAIN));
  const locale = env.LC_ALL || env.LC_CTYPE || env.LANG || "";
  const utf8 = /utf-?8/i.test(locale);

  let level: ColorLevel;
  const force = env.FORCE_COLOR;
  if (env.NO_COLOR) level = "none";
  else if (force === "0" || force === "false") level = "none";
  else if (force !== undefined && force !== "") level = force === "1" ? "basic" : force === "2" ? "256" : "truecolor";
  else if (!isTTY || env.TERM === "dumb") level = "none";
  else if (/truecolor|24bit/i.test(env.COLORTERM ?? "")) level = "truecolor";
  else if (/256color/.test(env.TERM ?? "")) level = "256";
  else level = "basic";

  const bg = Number((env.COLORFGBG ?? "").split(";").pop());
  const light = Number.isInteger(bg) && (bg === 7 || (bg >= 9 && bg <= 15));
  const appearance = opts.appearance ?? (env.EJM_APPEARANCE === "light" ? "light" : env.EJM_APPEARANCE === "dark" ? "dark" : light ? "light" : "dark");

  return createTheme({ level, appearance, unicode: !plain && utf8, animate: !plain && level !== "none" });
}

/** Terminal width used when no provider gives one. */
export const DEFAULT_COLUMNS = 80;

export interface EjmContextValue {
  theme: EjmTheme;
  /** Columns available to components. Falls back to the stdout width, then 80. */
  columns?: number;
}

let detected: EjmTheme | undefined;
export const EjmContext = createContext<EjmContextValue>({
  get theme() {
    return (detected ??= detectTheme());
  },
});

export const useEjm = (): EjmContextValue => useContext(EjmContext);

