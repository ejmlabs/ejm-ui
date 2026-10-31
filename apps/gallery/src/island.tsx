import { lazy, Suspense, useLayoutEffect, useState, type ComponentType } from 'react';
import { Hero, Page, Text } from '@ejm/ui';

type PageModule = { default: ComponentType };

function ReadyPage({ Body }: { Body: ComponentType }) {
  const [ready, setReady] = useState(false);
  // This commits only after the body has loaded and its handlers are attached.
  useLayoutEffect(() => setReady(true), []);
  // The base styles let a fieldset shrink to its column, so it needs no class. It is named by aria-label rather than a hidden legend.
  return <fieldset disabled={!ready} aria-label="Page examples">
    {!ready && <Page><Text as="p" variant="muted" role="status">Page controls are loading. The examples remain readable.</Text></Page>}
    <Body />
  </fieldset>;
}

/** Keep complete server HTML while page code loads immediately after the small site entry. */
export async function island(load: () => Promise<PageModule>, title: string): Promise<PageModule> {
  const Body = import.meta.env.SSR ? (await load()).default : lazy(load);
  return {
    default: () => (
      <Suspense fallback={<Hero title={title}><p role="status">Loading page controls…</p></Hero>}>
        <ReadyPage Body={Body} />
      </Suspense>
    ),
  };
}
