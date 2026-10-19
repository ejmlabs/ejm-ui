import { lazy } from 'react';
import { HarnessView } from '../views/HarnessView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

const Island = lazy(() => import('./harness'));

/** The ejm-harness demo: the static view in the server HTML, the interactive island in its own chunk when it is wanted. Ships only the ejm-harness view. */
export function LazyHarnessDemo(options: LazyIslandOptions) {
  return <LazyIsland island={Island} fallback={<HarnessView label="ejm-harness, a simulated screen" layout="auto" />} {...options} />;
}
