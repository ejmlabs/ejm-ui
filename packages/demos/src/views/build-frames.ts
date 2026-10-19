/** Builds the frames from the engines with a manual clock, so the result is the same every run. Used by `frames.test.ts` only; not shipped. */
import { createManualClock } from '../core';
import { createCliDemo } from '../cli';
import { createHarnessDemo } from '../harness';
import { createIdeDemo, type ChatItem } from '../ide';
import { cliLabels, cliScenario, harnessScenario, ideScenario } from '../scenarios';
import type { CliBlock, CliLine } from '../cli';
import type { DiffLine } from '../ide';
import type { Frames } from './frames';

/** The changed lines of the first hunk of a diff with one line of context on each side, and no file or hunk headers. */
function excerpt<T>(lines: T[], kind: (l: T) => 'add' | 'del' | 'ctx' | 'other'): T[] {
  const body = lines.filter((l) => kind(l) !== 'other');
  const first = body.findIndex((l) => kind(l) === 'add' || kind(l) === 'del');
  let last = first;
  for (let i = first; i < body.length && kind(body[i]!) !== 'ctx' || i === first; i++) if (kind(body[i]!) !== 'ctx') last = i;
  return body.slice(Math.max(0, first - 1), last + 2);
}

function cli(): Frames['cli'] {
  const clock = createManualClock();
  const demo = createCliDemo({ clock, reducedMotion: true });
  demo.dispatch({ type: 'submit', text: cliScenario.chips[1]!.prompt });
  clock.runAll();
  const s = demo.state;
  const you = s.blocks.find((b) => b.kind === 'you')!;
  const diff = s.blocks.find((b) => b.kind === 'assistant' && b.lines.some((l) => l.t === '```diff'))!;
  const patch = s.blocks.find((b) => b.kind === 'tool' && b.title.startsWith(cliLabels.patchTool))!;
  const hunks = diff.lines.flatMap((l, i) => (l.t.startsWith('@@') ? [i] : []));
  const diffLines: CliLine[] = diff.lines.slice(0, hunks[1]).filter((l) => l.r === 'ok' || l.r === 'err');
  const shown: CliBlock[] = [you, { ...diff, lines: diffLines }, patch];
  return { provider: cliScenario.app.provider, cwd: cliScenario.app.cwd, title: s.title, sessionId: s.sessionId, write: s.write, agents: 0, models: 0, tools: 0, blocks: shown, hints: cliLabels.hints };
}

function ide(): Frames['ide'] {
  const clock = createManualClock();
  const demo = createIdeDemo({ clock, reducedMotion: true });
  demo.dispatch({ type: 'prompt', text: ideScenario.chips[1]!.prompt });
  clock.runAll();
  const write = demo.state.chat.find((c): c is Extract<ChatItem, { kind: 'tool' }> => c.kind === 'tool' && c.review)!;
  demo.dispatch({ type: 'accept', id: write.id });
  const s = demo.state;
  const tools = s.chat.filter((c): c is Extract<ChatItem, { kind: 'tool' }> => c.kind === 'tool');
  const applied = s.chat.filter((c) => c.kind === 'agent').at(-1)!;
  const chat: ChatItem[] = [
    ...tools.map((t) => (t.diff ? { ...t, diff: excerpt<DiffLine>(t.diff, (l) => (l.kind === 'add' || l.kind === 'del' || l.kind === 'ctx' ? l.kind : 'other')) } : { ...t, output: undefined })),
    applied,
  ];
  const path = s.active!;
  return {
    agent: ideScenario.agent, chatTitle: s.chatTitle, model: ideScenario.models[0]!, openFiles: s.openFiles, active: path, tree: s.tree,
    file: { path, lang: path.endsWith('.rs') ? 'rust' : path.endsWith('.ts') ? 'ts' : 'text', text: s.files[path]! },
    changed: s.changed[path] ?? [], chat,
  };
}

function harness(): Frames['harness'] {
  const clock = createManualClock();
  const demo = createHarnessDemo({ clock });
  clock.advance(3000);
  demo.dispatch({ type: 'crash' });
  clock.advance(500);
  const s = demo.state;
  const sample = harnessScenario.langs[0]!;
  return { limit: s.limit, commands: s.commands, stats: s.stats, sessions: s.sessions, journal: s.journal.filter((j) => j.event !== 'session.interrupted').slice(-5), sample };
}

export const buildFrames = (): Frames => JSON.parse(JSON.stringify({ cli: cli(), ide: ide(), harness: harness() }));
