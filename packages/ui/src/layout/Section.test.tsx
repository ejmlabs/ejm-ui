import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { Hero, Section, SectionHead } from './index';

afterEach(cleanup);

const level = (name: string) => Number(screen.getByRole('heading', { name }).tagName.slice(1));

describe('Section heading levels', () => {
  it('renders its title as an h2 and a nested section as an h3', () => {
    render(
      <Section title="Projects">
        <Section title="Terminal"><p>Body</p></Section>
      </Section>,
    );
    expect(level('Projects')).toBe(2);
    expect(level('Terminal')).toBe(3);
  });

  it('keeps counting down through deeper sections and stops at h6', () => {
    render(
      <Section title="One"><Section title="Two"><Section title="Three"><Section title="Four"><Section title="Five"><Section title="Six" /></Section></Section></Section></Section></Section>,
    );
    expect(['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map(level)).toEqual([2, 3, 4, 5, 6, 6]);
  });

  it('gives a SectionHead inside a section the level of the section body, without `as`', () => {
    render(
      <Section title="Outer">
        <SectionHead title="Inner head" />
        <Section title="Nested"><SectionHead title="Deep head" /></Section>
      </Section>,
    );
    expect(level('Outer')).toBe(2);
    expect(level('Inner head')).toBe(3);
    expect(level('Nested')).toBe(3);
    expect(level('Deep head')).toBe(4);
  });

  it('leaves the page h1 to the Hero', () => {
    render(<main><Hero title="Product" /><Section title="Part" /></main>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(level('Part')).toBe(2);
  });
});

describe('Section names itself', () => {
  it('points aria-labelledby at a generated heading id', () => {
    render(<Section title="Generated" />);
    const heading = screen.getByRole('heading', { name: 'Generated' });
    expect(heading.id).not.toBe('');
    expect(screen.getByRole('region', { name: 'Generated' })).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('points aria-labelledby at the id it is given', () => {
    render(<Section title="Given" id="projects" />);
    expect(screen.getByRole('heading', { name: 'Given' })).toHaveAttribute('id', 'projects');
    expect(screen.getByRole('region', { name: 'Given' })).toHaveAttribute('aria-labelledby', 'projects');
  });

  it('labels a nested section with its own heading, with and without an id', () => {
    render(
      <Section title="Outer">
        <Section title="Generated nested" />
        <Section title="Given nested" id="given-nested" />
      </Section>,
    );
    const generated = screen.getByRole('heading', { name: 'Generated nested' });
    expect(screen.getByRole('region', { name: 'Generated nested' })).toHaveAttribute('aria-labelledby', generated.id);
    expect(screen.getByRole('region', { name: 'Given nested' })).toHaveAttribute('aria-labelledby', 'given-nested');
    const ids = screen.getAllByRole('heading').map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Section ground', () => {
  it('is an automatic band that paints its own ground in the page column', () => {
    render(<Section title="Auto"><p>Body</p></Section>);
    const section = screen.getByRole('region', { name: 'Auto' });
    expect(section).toHaveAttribute('data-band', 'auto');
    expect(section).toHaveClass('band', 'py-rhythm');
    expect(section.firstElementChild).toHaveClass('page');
  });

  it('takes the Sage ground with emphasis', () => {
    render(<Section title="Emphasis" emphasis />);
    expect(screen.getByRole('region', { name: 'Emphasis' })).toHaveAttribute('data-band', 'sage');
  });

  it('gives a nested section no band, and ignores emphasis there', () => {
    const { container } = render(
      <Section title="Outer">
        <Section title="Nested" emphasis><p>Body</p></Section>
      </Section>,
    );
    const nested = screen.getByRole('region', { name: 'Nested' });
    expect(nested).not.toHaveAttribute('data-band');
    expect(nested).not.toHaveClass('band');
    expect(container.querySelectorAll('[data-band]')).toHaveLength(1);
  });

  it('marks every top-level section auto, so the generated selectors alternate them', () => {
    const { container } = render(<main><Hero title="Product" /><Section title="A" /><Section title="B" emphasis /><Section title="C" /></main>);
    expect([...container.querySelectorAll('main > [data-band]')].map(el => el.getAttribute('data-band'))).toEqual(['paper', 'auto', 'sage', 'auto']);
  });
});

describe('Section content and rhythm', () => {
  it('places the kicker, intro and actions in the opening, and the children in a body with one fixed rhythm', () => {
    render(
      <Section title="Projects" kicker="01 / Projects" intro={<p>Small experiments.</p>} actions={<a href="#all">See all</a>}>
        <p>First</p>
        <ul><li>Item</li></ul>
      </Section>,
    );
    const section = screen.getByRole('region', { name: 'Projects' });
    const head = section.querySelector('header')!;
    expect(head).toHaveTextContent('01 / Projects');
    expect(head).toContainElement(screen.getByText('Small experiments.'));
    expect(head).toContainElement(screen.getByRole('link', { name: 'See all' }));
    expect(head.querySelector('.text-lead')).toContainElement(screen.getByText('Small experiments.'));
    const body = screen.getByText('First').parentElement!;
    expect(body).toHaveClass('mt-16', 'grid', 'gap-16');
    expect(body).toHaveClass('[&>p:not([class])]:max-w-measure', '[&>ul:not([class])]:max-w-measure', '[&>ol:not([class])]:max-w-measure');
    expect(head.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives a bare link in hero or section actions a 44px target on touch, since it is a control there and not running text', () => {
    render(<main><Hero title="Product" actions={<a href="/start/">Start</a>} /><Section title="A" actions={<a href="#all">See all</a>} /></main>);
    for (const name of ['Start', 'See all']) expect(screen.getByRole('link', { name }).parentElement).toHaveClass('[&>a]:touch-target', '[&>a]:content-center');
  });

  it('renders no empty copy column or body without intro, actions or children', () => {
    render(<Section title="Only a title" />);
    const section = screen.getByRole('region', { name: 'Only a title' });
    expect(section.querySelector('.text-lead')).toBeNull();
    expect(section.querySelector('.mt-16')).toBeNull();
  });

  it('gives a nested section heading type, an optional kicker and a tighter body', () => {
    render(
      <Section title="Outer">
        <Section title="Nested" kicker="Detail"><p>Body</p></Section>
        <Section title="Plain"><p>Other</p></Section>
      </Section>,
    );
    expect(screen.getByRole('heading', { name: 'Nested' })).toHaveClass('text-heading');
    expect(screen.getByRole('region', { name: 'Nested' })).toHaveTextContent('Detail');
    expect(screen.getByRole('region', { name: 'Plain' })).not.toHaveTextContent('Detail');
    expect(screen.getByText('Body').parentElement).toHaveClass('mt-6', 'grid', 'gap-6');
  });
});

describe('Section accessibility', () => {
  it('passes axe with a hero, sections and a subsection', async () => {
    const { container } = render(
      <main>
        <Hero title="Product" />
        <Section title="Projects" kicker="01" intro="Copy" actions={<a href="#x">Go</a>}>
          <p>Body</p>
          <Section title="Terminal" kicker="Detail"><p>More</p></Section>
        </Section>
        <Section title="Why" emphasis><p>Because</p></Section>
      </main>,
    );
    await expectAccessible(container);
  });
});

describe('Section width', () => {
  it('lets its body and a subsection shrink below a wide child, so a table cannot widen a phone page', () => {
    render(
      <Section title="Outer">
        <Section title="Inner"><p>Wide</p></Section>
      </Section>,
    );
    const inner = screen.getByRole('region', { name: 'Inner' });
    expect(inner).toHaveClass('min-w-0');
    expect(inner.parentElement).toHaveClass('grid-cols-[minmax(0,1fr)]');
    expect(screen.getByText('Wide').parentElement).toHaveClass('grid-cols-[minmax(0,1fr)]');
  });
});
