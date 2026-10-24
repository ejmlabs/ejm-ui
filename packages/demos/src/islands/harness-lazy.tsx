import { lazy } from 'react';
import type { HarnessShowcaseProps } from './harness-showcase';
import { HarnessScreen, HarnessView } from '../views/HarnessView';
import { RecordedView } from '../views/RecordedView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

const Island = /* @__PURE__ */ lazy(() => import('./harness'));

/** The ejm-harness demo: the static view in the server HTML, the interactive island in its own chunk when it is wanted. Ships only the ejm-harness view. */
export function LazyHarnessDemo(options: LazyIslandOptions) {
  return <LazyIsland island={Island} fallback={<HarnessView label="ejm-harness, a simulated screen" layout="auto" />} {...options} />;
}

const Showcase = /* @__PURE__ */ lazy(() => import('./harness-showcase'));
export type { HarnessRecording, HarnessRecordingSource, HarnessRecordedUpdate } from '../harness-playback';

/** A recorded read-only snapshot. The product's timeline loads only when the island is wanted. */
export function LazyHarnessShowcase({ source, options, ...lazyOptions }: LazyIslandOptions & HarnessShowcaseProps) {
  return <LazyIsland island={<Showcase source={source} options={options} />} fallback={<RecordedView name="ejm-harness"><HarnessScreen frame={source.finalFrame} /></RecordedView>} loadLabel={false} {...lazyOptions} />;
}
