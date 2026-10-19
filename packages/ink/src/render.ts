import chalk from "chalk";
import type { ColorLevel } from "./theme";

const CHALK_LEVEL: Record<ColorLevel, 0 | 1 | 2 | 3> = { none: 0, basic: 1, "256": 2, truecolor: 3 };

/** Make chalk (used by Ink) emit exactly the color level the theme chose. Call once before render. */
export function applyColorLevel(level: ColorLevel): void {
  chalk.level = CHALK_LEVEL[level];
}
