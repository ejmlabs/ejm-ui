import { lazy, type ComponentType } from 'react';
import { CliView } from '../views/CliView';
import { HarnessView } from '../views/HarnessView';
import { IdeView } from '../views/IdeView';
import { LazyIsland, type LazyIslandOptions } from './LazyIsland';

export type DemoProduct = 'cli' | 'ide' | 'harness';

// Each import() is its own chunk, fetched only when the demo is asked for. Nothing here imports an island statically.
const islands: Record<DemoProduct, ComponentType> = {
  cli: lazy(() => import('./cli')),
  ide: lazy(() => import('./ide')),
  harness: lazy(() => import('./harness')),
};
const views: Record<DemoProduct, { name: string; view: ComponentType<{ label?: string; layout?: 'stack' | 'split' | 'auto' }> }> = {
  cli: { name: 'ejm-cli', view: CliView },
  ide: { name: 'ejm-ide', view: IdeView },
  harness: { name: 'ejm-harness', view: HarnessView },
};

export interface LazyDemoProps extends LazyIslandOptions {
  product: DemoProduct;
}

/**
 * A product demo that costs nothing until it is wanted (see LazyIsland), for any of the three products. It imports all three static views
 * and their frames (about 8 KB gzip) whichever product you pass, so a page that shows one product should use that product's entry instead:
 * `LazyCliDemo` from `@ejm/demos/islands/cli-lazy`, `LazyIdeDemo` from `.../ide-lazy`, `LazyHarnessDemo` from `.../harness-lazy`.
 */
export function LazyDemo({ product, ...options }: LazyDemoProps) {
  const { name, view: View } = views[product];
  const fallback = <View label={`${name}, a simulated screen`} layout={product === 'cli' ? undefined : 'auto'} />;
  return <LazyIsland island={islands[product]} fallback={fallback} {...options} />;
}
