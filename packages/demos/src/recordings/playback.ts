import { createRuntime, type Demo, type DemoOptions, type Run } from '../core';

/** A digest of the capture input manifest. It identifies content; it grants no execution authority. */
export interface Recording<Update> {
  id: string;
  beats: readonly { at: number; update: Update }[];
}

/** Product-owned data. load must only import a bundled recording, without running a command or provider. */
export interface RecordingSource<Frame, Update> {
  id: string;
  initialFrame: Frame;
  finalFrame: Frame;
  load(): Promise<Recording<Update>>;
}

export type PlaybackAction = { type: 'start' } | { type: 'finish' } | { type: 'page-visible'; value: boolean };
export interface PlaybackState<Frame> {
  frame: Frame;
  playback: 'idle' | 'running' | 'completed';
  paused: boolean;
  visible: boolean;
}

export function validateRecording<Update>(expectedId: string, recording: Recording<Update>): void {
  if (!/^[a-f0-9]{64}$/.test(expectedId) || recording.id !== expectedId) throw new Error('Recording identity does not match');
  if (!Array.isArray(recording.beats) || !recording.beats.length || recording.beats.length > 256) throw new Error('Recording frame count is invalid');
  let previous = 0;
  for (const beat of recording.beats) {
    if (!Number.isFinite(beat.at) || beat.at < previous || beat.at > 120_000) throw new Error('Recording time is invalid');
    previous = beat.at;
  }
}

/** A finite data adapter over the existing clock. Owns no timer, worker, provider or history. */
export function createRecordedPlayback<Frame, Update>(
  source: Pick<RecordingSource<Frame, Update>, 'id' | 'initialFrame' | 'finalFrame'>,
  recording: Recording<Update>,
  apply: (frame: Frame, update: Update) => Frame,
  options: DemoOptions = {},
): Demo<PlaybackState<Frame>, PlaybackAction> {
  validateRecording(source.id, recording);
  const runtime = createRuntime(options, 1);
  let frame = source.finalFrame;
  let playback: PlaybackState<Frame>['playback'] = 'idle';
  let viewportVisible = options.visible ?? true;
  let pageVisible = true;
  let disposed = false;
  const changed = () => runtime.changed();
  const reset = () => { frame = source.finalFrame; playback = 'idle'; };
  const finish = () => {
    runtime.killAll();
    frame = source.finalFrame;
    playback = 'completed';
    changed();
  };
  function* play(): Run {
    let previous = 0;
    for (const beat of recording.beats) {
      if (beat.at > previous) yield beat.at - previous;
      frame = apply(frame, beat.update);
      previous = beat.at;
      changed();
    }
    playback = 'completed';
    changed();
  }
  const snapshot = () => runtime.snapshot(() => ({ frame, playback, paused: playback === 'running' && runtime.paused, visible: runtime.visible }));
  return {
    getState: snapshot,
    get state() { return snapshot(); },
    subscribe: runtime.subscribe,
    dispatch(action) {
      if (disposed && action.type !== 'reset') return;
      if (action.type === 'reset') disposed = false;
      runtime.act(() => {
        if (action.type === 'start') {
          if (playback !== 'idle') return;
          if (runtime.reduced) return finish();
          frame = source.initialFrame;
          playback = 'running';
          runtime.start(play());
          changed();
        } else if (action.type === 'finish') finish();
        else if (action.type === 'visible' || action.type === 'page-visible') {
          if (action.type === 'visible') viewportVisible = action.value;
          else pageVisible = action.value;
          const visibility = { type: 'visible', value: viewportVisible && pageVisible };
          runtime.common(visibility, () => {}, reset);
        } else runtime.common(action, () => {}, reset);
      });
    },
    destroy() { disposed = true; runtime.killAll(); },
  };
}
