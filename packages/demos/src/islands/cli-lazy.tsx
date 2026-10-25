import { lazy } from 'react';
import type { CliShowcaseProps } from './cli-showcase';
import { CliScreen } from '../views/CliView';
import { RecordedView } from '../views/RecordedView';
import { CliView } from '../views/CliView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

const Island = /* @__PURE__ */ lazy(() => import('./cli'));

/** The ejm-cli demo: the static view in the server HTML, the interactive island in its own chunk when it is wanted. Ships only the ejm-cli view. */
export function LazyCliDemo(options: LazyIslandOptions) {
  return <LazyIsland island={Island} fallback={<CliView label="ejm-cli, a simulated screen" />} {...options} />;
}

const Showcase = /* @__PURE__ */ lazy(() => import('./cli-showcase'));
export type { CliRecording, CliRecordingSource, CliRecordedUpdate } from '../cli-playback';

/** A product-owned recorded transcript. The full recording is imported only after the lazy island is wanted. */
export function LazyCliShowcase({ source, options, ...lazyOptions }: LazyIslandOptions & CliShowcaseProps) {
  return <LazyIsland island={<Showcase source={source} options={options} />} fallback={<RecordedView name="ejm-cli"><CliScreen frame={source.finalFrame} /></RecordedView>} loadLabel={false} {...lazyOptions} />;
}
