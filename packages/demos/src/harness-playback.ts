import type { DemoOptions } from './core';
import { createRecordedPlayback, validateRecording, type Recording, type RecordingSource } from './recordings/playback';
import type { HarnessFrame } from './views/frames';

/** Complete replacement fields from a product-owned observed snapshot, with no visitor mutations. */
export type HarnessRecordedUpdate = Partial<HarnessFrame>;
export type HarnessRecording = Recording<HarnessRecordedUpdate>;
export type HarnessRecordingSource = RecordingSource<HarnessFrame, HarnessRecordedUpdate>;

export function validateHarnessRecording(id: string, recording: HarnessRecording): void {
  validateRecording(id, recording);
  if (JSON.stringify(recording).length > 262_144) throw new Error('Recording data is too large');
  for (const { update } of recording.beats) {
    if ((update.sessions?.length ?? 0) > 256 || (update.journal?.length ?? 0) > 512) throw new Error('Recording snapshot is too large');
  }
}

export function createHarnessPlayback(source: HarnessRecordingSource, recording: HarnessRecording, options: DemoOptions = {}) {
  validateHarnessRecording(source.id, recording);
  return createRecordedPlayback(source, recording, (frame, update) => ({ ...frame, ...update }), options);
}
