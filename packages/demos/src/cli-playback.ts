import type { CliBlock } from './cli';
import type { DemoOptions } from './core';
import { createRecordedPlayback, validateRecording, type Recording, type RecordingSource } from './recordings/playback';
import type { CliFrame } from './views/frames';

export interface CliRecordedUpdate {
  status?: Partial<Pick<CliFrame, 'title' | 'agents' | 'models' | 'tools'>>;
  blocks?: readonly CliBlock[];
}
export type CliRecording = Recording<CliRecordedUpdate>;
export type CliRecordingSource = RecordingSource<CliFrame, CliRecordedUpdate>;

export function validateCliRecording(id: string, recording: CliRecording): void {
  validateRecording(id, recording);
  if (JSON.stringify(recording).length > 262_144) throw new Error('Recording data is too large');
  const ids = new Set<number>();
  for (const { update } of recording.beats) {
    if (update.blocks && update.blocks.length > 256) throw new Error('Recording has too many blocks');
    for (const block of update.blocks ?? []) {
      ids.add(block.id);
      if (ids.size > 256 || block.lines.length > 512) throw new Error('Recording has too much text');
    }
  }
}

export function createCliPlayback(source: CliRecordingSource, recording: CliRecording, options: DemoOptions = {}) {
  validateCliRecording(source.id, recording);
  return createRecordedPlayback(source, recording, (frame, update) => {
    const blocks = new Map(frame.blocks.map((block) => [block.id, block]));
    for (const block of update.blocks ?? []) blocks.set(block.id, block);
    return {
      ...frame,
      title: update.status?.title ?? frame.title,
      agents: update.status?.agents ?? frame.agents,
      models: update.status?.models ?? frame.models,
      tools: update.status?.tools ?? frame.tools,
      blocks: [...blocks.values()],
    };
  }, options);
}
