export const demosVersion = '0.1.0';

export { createManualClock, systemClock } from './core';
export type { Clock, CommonAction, Demo, DemoOptions, ManualClock } from './core';
export { cliGlyphs, createCliDemo, GLYPHS_ASCII, GLYPHS_UNICODE } from './cli';
export type { CliAction, CliBlock, CliLine, CliOptions, CliState, BlockKind, SessionRow } from './cli';
export { createIdeDemo } from './ide';
export type { ChatItem, DiffLine, IdeAction, IdeOptions, IdeState, PaletteItem, ToolItem, TreeEntry } from './ide';
export { createHarnessDemo } from './harness';
export type { HarnessAction, HarnessOptions, HarnessSession, HarnessState, JournalEntry, Level, SessionPhase } from './harness';
export { cliLabels, cliScenario, harnessScenario, ideLabels, ideScenario, labels, project } from './scenarios';
export { applyEdits, buildDiff, diffKind, matchPrompt, splitLines } from './text';
export type * from './types';
