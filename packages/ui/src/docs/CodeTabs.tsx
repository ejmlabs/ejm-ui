import type { ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';
import { CodeTabsFrame } from './CodeTabsFrame';
import { useHydrated } from './hooks';

export interface CodeTab {
  label: string;
  code?: string;
  lang?: string | undefined;
  children?: ReactNode;
}

/** Language tabs with highlighted code, or caller-supplied content. */
export function CodeTabs({ label, tabs }: { label?: string | undefined; tabs: readonly CodeTab[] }) {
  const hydrated = useHydrated();
  return <CodeTabsFrame label={label} tabs={tabs.map((tab) => ({
    label: tab.label,
    children: tab.code !== undefined ? <CodeBlock code={tab.code} lang={tab.lang} quietLabel={hydrated} /> : tab.children,
  }))} />;
}
