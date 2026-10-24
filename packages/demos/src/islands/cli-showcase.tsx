import { createCliPlayback, validateCliRecording, type CliRecordingSource } from '../cli-playback';
import { CliScreen } from '../views/CliView';
import type { CliFrame } from '../views/frames';
import { RecordedIsland, type RecordedOptions } from './RecordedIsland';

export interface CliShowcaseProps {
  source: CliRecordingSource;
  /** The injected clock and speed are useful for checks and captures. */
  options?: RecordedOptions;
}
const renderFrame = (frame: CliFrame) => <CliScreen frame={frame} />;

/** Loaded only on approach. The source owns content; this component never runs a provider or command. */
export default function CliShowcase(props: CliShowcaseProps) {
  return <RecordedIsland name="ejm-cli" {...props} validate={validateCliRecording} create={createCliPlayback} renderFrame={renderFrame} />;
}
