import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { DensityProvider } from '../lib/density';
import { Callout } from './Callout';
import { CodeBlock } from './CodeBlock';
import { CodeTabs } from './CodeTabs';
import { Contents } from './Contents';
import { DocsSidebar } from './DocsSidebar';
import { DocTable } from './DocTable';
import { Heading } from './Heading';
import { Pager } from './Pager';
import { ParamTable } from './ParamTable';
import { Prose } from './Prose';
import { SidebarFilter } from './SidebarFilter';

// What the docs parts render, in the states a reader sees: every one of them goes through the checks below.
const groups = [{ title: 'Start', items: [{ label: 'Getting started', href: '/docs' }, { label: 'Design', href: '/docs/design' }] }];
const toc = [{ id: 'a', label: 'Install', level: 2 as const }, { id: 'b', label: 'Cookie', level: 3 as const }];
const everything = (): ReactElement => (
  <Prose>
    <DocsSidebar groups={groups} current="/docs" filter />
    <Contents items={toc} />
    <SidebarFilter value="" onChange={() => {}} status="" />
    <Heading id="a">Install</Heading>
    <Heading level={3} id="b">Cookie</Heading>
    <p>Use <code>cn</code> here.</p>
    <Callout kind="warning">Back up the file.</Callout>
    <CodeBlock code="const a = 1;" lang="ts" />
    <CodeTabs tabs={[{ label: 'CSS', code: 'a {}', lang: 'css' }, { label: 'Rust', code: 'fn a() {}', lang: 'rust' }]} />
    <ParamTable caption="Props" rows={[{ name: 'kind', type: "'note'", default: 'required', description: 'Which aside.' }]} />
    <DocTable caption="Gates" heads={['Gate', 'Fails on']} rows={[['Contrast', 'Text under 4.5:1.']]} />
    <Pager prev={{ href: '/a', title: 'A' }} next={{ href: '/b', title: 'B' }} />
  </Prose>
);

const tokens = (root: Element) => [...root.querySelectorAll('[class]')].flatMap((el) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
// One control system (openspec/changes/systemic-kit/design.md): these utilities no longer exist in the kit.
const retired = /^(focus-ring|transition-colors|transition-all|uppercase|tracking-wider|rounded-(sm|md|lg|compact)|text-(xs|lg|xl|2xl|3xl|stat|display-lg|\[.*\]))$/;

describe('the docs parts follow the one system', () => {
  it('use none of the retired utilities: color changes are instant, type has no literal sizes, focus is global', () => {
    const { container } = render(everything());
    const used = new Set(tokens(container).map((t) => t.split(':').pop()!));
    expect([...used].filter((t) => retired.test(t))).toEqual([]);
  });

  it('do not restyle inline code: it is plain mono from the base style, with no fill', () => {
    render(<Prose><p>Use <code>cn</code> here.</p></Prose>);
    expect(screen.getByText('cn')).not.toHaveAttribute('class');
    const rules = screen.getByText('cn').closest('div')!.className;
    expect(rules).not.toMatch(/\bbg-tone|rounded-control|px-1\.5/);
  });

  it('ignore a class or style an untyped caller still passes: the kit owns every class', () => {
    const stray = { className: 'stray-class', style: { color: 'red' } } as object;
    const { container } = render(
      <>
        <Callout {...stray}>x</Callout>
        <CodeBlock code="a" lang="ts" {...stray} />
        <CodeTabs tabs={[{ label: 'CSS', code: 'a', lang: 'css' }]} {...stray} />
        <Contents items={toc} {...stray} />
        <DocsSidebar groups={groups} current="/docs" {...stray} />
        <Heading id="h" {...stray}>H</Heading>
        <Pager next={{ href: '/b', title: 'B' }} {...stray} />
        <ParamTable caption="P" rows={[{ name: 'a', description: 'b' }]} {...stray} />
        <DocTable caption="T" heads={['A']} rows={[['b']]} {...stray} />
        <Prose {...stray}>x</Prose>
      </>,
    );
    expect(container.querySelector('.stray-class')).toBeNull();
    expect(container.querySelector('[style*="red"]')).toBeNull();
  });

  it('give the sidebar and the contents one link look: hover fills with tone, the current entry takes the rule, the tone and the text', () => {
    render(<><DocsSidebar groups={groups} current="/docs" /><Contents items={toc} /></>);
    const side = within(screen.getByRole('navigation', { name: 'Documentation' })).getByRole('link', { name: 'Design' });
    const here = within(screen.getByRole('navigation', { name: 'On this page' })).getByRole('link', { name: 'Install' });
    expect(side.className.split(' ').sort()).toEqual(here.className.split(' ').sort());
    for (const token of ['hover:bg-tone', 'rounded-e-control', 'aria-[current]:border-fg', 'aria-[current]:bg-tone', 'aria-[current]:text-fg']) expect(side).toHaveClass(token);
    // A level 3 entry is indented, nothing else changes.
    const nested = screen.getByRole('link', { name: 'Cookie' });
    expect(nested).toHaveClass('ps-7');
    expect(nested).not.toHaveClass('ps-4');
  });

  it('size the filter box like an Input, and keep its focus outline inside the scrolling sidebar', () => {
    render(<DocsSidebar groups={groups} current="/docs" filter />);
    const box = screen.getByRole('searchbox', { name: 'Filter pages' });
    for (const token of ['min-h-11', 'rounded-control', 'border-control', 'text-base', 'focus-visible:outline-offset-[-2px]']) expect(box).toHaveClass(token);
  });

  it('set tables in hairline rows of py-4, and py-2 on a compact surface', () => {
    const rows = [{ name: 'kind', description: 'Which aside.' }];
    const tables = (
      <>
        <ParamTable caption="Props" rows={rows} />
        <DocTable caption="Gates" heads={['Gate', 'Fails on']} rows={[['Contrast', 'Text under 4.5:1.']]} />
      </>
    );
    const comfortable = render(tables);
    for (const row of screen.getAllByRole('row')) expect(row).toHaveClass('hairline');
    for (const cell of [...screen.getAllByRole('cell'), ...screen.getAllByRole('rowheader')]) expect(cell).toHaveClass('py-4');
    comfortable.unmount();
    render(<DensityProvider density="compact">{tables}</DensityProvider>);
    for (const cell of [...screen.getAllByRole('cell'), ...screen.getAllByRole('rowheader')]) expect(cell).toHaveClass('py-2');
  });

  it('label a callout in the meta face, not in shouting capitals', () => {
    render(<Callout kind="tip">Try it.</Callout>);
    const word = screen.getByRole('note').firstElementChild!;
    expect(word).toHaveTextContent('Tip');
    expect(word).toHaveClass('text-meta');
    expect(word).not.toHaveClass('uppercase');
  });

  it('are accessible as one page', async () => {
    const { container } = render(<main><h1>Docs</h1>{everything()}</main>);
    await expectAccessible(container);
  });
});
