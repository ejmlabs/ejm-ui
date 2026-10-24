import { createHarnessPlayback, validateHarnessRecording, type HarnessRecordingSource } from '../harness-playback';
import { HarnessScreen } from '../views/HarnessView';
import type { HarnessFrame } from '../views/frames';
import { RecordedIsland, type RecordedOptions } from './RecordedIsland';

export interface HarnessShowcaseProps {
  source: HarnessRecordingSource;
  options?: RecordedOptions;
}
const renderFrame = (frame: HarnessFrame) => <HarnessScreen frame={frame} />;

/** A passive product-owned snapshot replay. It does not run a worker, provider or governor. */
export default function HarnessShowcase(props: HarnessShowcaseProps) {
  return <RecordedIsland name="ejm-harness" {...props} validate={validateHarnessRecording} create={createHarnessPlayback} renderFrame={renderFrame} />;
}
