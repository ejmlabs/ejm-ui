/** Types for the scenario data in ./scenarios. Scenarios are plain JSON; `validate.ts` checks files against these shapes. */

export interface Edit {
  /** Text that must occur exactly once in the file. */
  find: string;
  replace: string;
}

export interface Chip {
  id: string;
  label: string;
  /** Sent as the visitor's message when the chip is picked. */
  prompt: string;
}

/** A prompt matches the first rule whose `words` has a substring of the lower-cased prompt. */
export interface MatchRule {
  id: string;
  words: string[];
}

export interface ProjectFile {
  path: string;
  lang: string;
  text: string;
}

/** The sample repository (harbor.json) the cli and ide scenarios read and edit. */
export interface Project {
  name: string;
  note: string;
  files: ProjectFile[];
}

/** Fields every product scenario has. */
export interface Frame {
  label: string;
  name: string;
  caption: string;
  /** The honesty sentence: simulated, nothing sent anywhere. */
  note: string;
  seed?: number;
}

export interface SayStep {
  say: string;
}

/** A scripted read-only tool call. Exactly one of `read`, `search`, `list` selects what it prints. */
export interface ToolStep {
  tool: string;
  args: string;
  read?: { path: string; to?: number };
  search?: string;
  list?: true;
}

/** ejm-cli: a patch that is blocked unless write is granted. */
export interface PatchStep {
  patch: { path: string; edits: Edit[] };
  intro: string;
  applied: string;
  blocked: string;
}

/** ejm-ide: a proposed write the visitor accepts or rejects. */
export interface WriteStep {
  write: { path: string; edits: Edit[] };
  intro: string;
  applied: string;
  rejected: string;
}

export type CliStep = SayStep | ToolStep | PatchStep;
export type IdeStep = SayStep | ToolStep | WriteStep;

export interface Script<S> {
  title: string;
  steps: S[];
}

export interface SavedSession {
  id: string;
  state: 'idle' | 'interrupted';
  title: string;
  transcript: { kind: 'you' | 'assistant'; text: string }[];
}

export interface CliScenario extends Frame {
  project: string;
  app: { name: string; provider: string; cwd: string; title: string; sessionId: string };
  empty: { title: string; help: string[] };
  chips: Chip[];
  match: MatchRule[];
  scenarios: Record<string, Script<CliStep>>;
  afterGrant: { say: string };
  blockedNotice: string;
  fallback: string;
  sessions: SavedSession[];
  /** Section name to [key, action] rows, plus a `footer` string. */
  help: Record<string, [string, string][] | string> & { footer: string };
}

export interface IdeScenario extends Frame {
  project: string;
  reviewNote: string;
  agent: string;
  openFiles: string[];
  models: string[];
  chips: Chip[];
  match: MatchRule[];
  scenarios: Record<string, Script<IdeStep>>;
  fallback: string;
}

export interface PlanPhase {
  kind: 'model' | 'command';
  label: string;
  min: number;
  max: number;
}

export interface LangSample {
  id: string;
  label: string;
  caption: string;
  code: string;
}

export interface HarnessScenario extends Frame {
  seed: number;
  tickMs: number;
  defaults: { limit: number; commands: number; start: number };
  realDefaults: string;
  plan: PlanPhase[];
  recoveryTicks: number;
  langs: LangSample[];
}

/** Strings that name commands, flags, keys or tools. The honesty check reads these. */
export interface CliLabels {
  grantWrite: string;
  grantHint: string;
  plain: string;
  plainHint: string;
  controlsNote: string;
  stopButton: string;
  sessionsButton: string;
  hints: [string, string][];
  patchTool: string;
  blockedLine: string;
  runStopped: string;
  stopIdle: string;
  quitNotice: string;
  /** Contains `{cmd}`. */
  unsupportedNotice: string;
  /** Contains `{cmd}`. */
  unknownCommand: string;
  /** Slash commands the demo handles. */
  commands: string[];
  /** Slash commands that exist in the product but answer "not part of this demo". */
  unsupportedCommands: string[];
}

export interface IdeLabels {
  writeTool: string;
  paletteSwitchModel: string;
  paletteToggleTheme: string;
  paletteOpenFile: string;
  applyError: string;
}

export interface Labels {
  cli: CliLabels;
  ide: IdeLabels;
}
