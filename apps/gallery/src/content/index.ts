import type { DocSet } from '@ejm/ui';
import { checks } from './checks';
import { components } from './components';
import { designLanguage } from './design-language';
import { gettingStarted } from './getting-started';
import { theming } from './theming';
import { tokensAndBands } from './tokens-and-bands';

/** The ejm-ui docs. The first page is the index at /docs; the others are /docs/<slug>. */
export const docs: DocSet = {
  base: '/docs',
  pages: [gettingStarted, designLanguage, tokensAndBands, theming, components, checks],
};
