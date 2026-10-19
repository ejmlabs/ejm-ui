import { Hero, type HeroProps } from '@ejm/ui/layout/Hero';
import { ProductStage } from '@ejm/ui/layout/ProductWindow';
import type { ReactNode } from 'react';
import { CliView } from '../views/CliView';
import { HarnessView } from '../views/HarnessView';
import { IdeView } from '../views/IdeView';

export type ProductHeroProps = Omit<HeroProps, 'aside'>;
export type ProductHeroStageProps = ProductHeroProps & {
  /** The windows of the stage: any of `CliHeroWindow`, `HarnessHeroWindow` and `IdeHeroWindow`, in the order they should overlap (back to front). */
  windows: ReactNode;
};

/** The ejm-cli window as the hero places it: at rest, label on the left, compact. Imports only the cli view. */
export const CliHeroWindow = () => <CliView elevation="rest" labelSide="start" compact />;
/** The ejm-harness window as the hero places it: raised, stacked. Imports only the harness view. */
export const HarnessHeroWindow = () => <HarnessView elevation="raised" layout="stack" />;
/** The ejm-ide window as the hero places it: floating, stacked. Imports only the ide view. */
export const IdeHeroWindow = () => <IdeView elevation="float" layout="stack" />;

/**
 * The type-led hero with a stage of product windows beside it, and only the windows you pass. A site that shows one product passes one window
 * and ships one view:
 * `<ProductHeroStage title="..." windows={<CliHeroWindow />}>Copy</ProductHeroStage>`.
 * The windows are decoration (hidden from assistive technology) and carry the "Simulated screen" label. The entrance is the Hero's.
 */
export function ProductHeroStage({ windows, ...props }: ProductHeroStageProps) {
  return <Hero {...props} aside={<ProductStage>{windows}</ProductStage>} />;
}

/**
 * ProductHeroStage with all three windows (ejm-cli, ejm-ide and ejm-harness), drawn from the demo scenarios. It imports all three views, about 8 KB gzip
 * more than one, so prefer ProductHeroStage with the windows the page needs. The staged entrance is the Hero's: copy first, then the windows, 880ms in all,
 * transform and opacity only, and everything is already in place without scripts or under reduced motion.
 */
export function ProductHero(props: ProductHeroProps) {
  return (
    <ProductHeroStage
      {...props}
      windows={
        <>
          <CliHeroWindow />
          <HarnessHeroWindow />
          <IdeHeroWindow />
        </>
      }
    />
  );
}
