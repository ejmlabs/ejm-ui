import type { ReactElement } from "react";
import { render } from "ink-testing-library";
import { applyColorLevel } from "./render";
import { createTheme, EjmContext, type ColorLevel } from "./theme";

// ink-testing-library's fake stdout has no rows, so Ink asks terminal-size, which spawns tput (about 0.4s a render). These skip that.
process.env.COLUMNS ??= "100";
process.env.LINES ??= "24";

/** Render a component under a chosen color level and width and return the last frame. Test helper. */
export function show(node: ReactElement, opts: { level?: ColorLevel; columns?: number; unicode?: boolean } = {}): string {
  const level = opts.level ?? "none";
  applyColorLevel(level);
  const theme = createTheme({ level, unicode: opts.unicode ?? true });
  const app = render(<EjmContext.Provider value={{ theme, columns: opts.columns ?? 80 }}>{node}</EjmContext.Provider>);
  const frame = app.lastFrame() ?? "";
  app.unmount();
  return frame;
}

// eslint-disable-next-line no-control-regex
export const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/;
export const stripAnsi = (s: string) => s.replace(new RegExp(ANSI.source, "g"), "");
