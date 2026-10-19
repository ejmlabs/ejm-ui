import { lazy } from 'react';
import { CliView } from '../views/CliView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

const Island = lazy(() => import('./cli'));

/** The ejm-cli demo: the static view in the server HTML, the interactive island in its own chunk when it is wanted. Ships only the ejm-cli view. */
export function LazyCliDemo(options: LazyIslandOptions) {
  return <LazyIsland island={Island} fallback={<CliView label="ejm-cli, a simulated screen" />} {...options} />;
}
