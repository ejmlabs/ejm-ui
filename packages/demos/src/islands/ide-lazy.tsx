import { lazy } from 'react';
import { IdeView } from '../views/IdeView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

const Island = lazy(() => import('./ide'));

/** The ejm-ide demo: the static view in the server HTML, the interactive island in its own chunk when it is wanted. Ships only the ejm-ide view. */
export function LazyIdeDemo(options: LazyIslandOptions) {
  return <LazyIsland island={Island} fallback={<IdeView label="ejm-ide, a simulated screen" layout="auto" />} {...options} />;
}
