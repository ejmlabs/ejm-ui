import { render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { useDensity } from '../lib/density';
import { ColorSwatches, DensityPair, DrawOnSample, ElevationSample, RadiusSample, ResizableSample, ThemePair, TypeScaleSample } from './Specimens';

function Probe() {
  return <output>{useDensity()}</output>;
}

describe('ThemePair', () => {
  it('renders its content once under each theme, on the Paper ground, side by side from its own width', async () => {
    const { container } = render(<ThemePair><button type="button">Save</button></ThemePair>);
    const light = screen.getByRole('group', { name: 'light theme' });
    const dark = screen.getByRole('group', { name: 'dark theme' });
    expect(light).toHaveAttribute('data-theme', 'light');
    expect(dark).toHaveAttribute('data-theme', 'dark');
    for (const pane of [light, dark]) {
      expect(pane).toHaveAttribute('data-band', 'paper');
      expect(pane).toHaveClass('band');
      expect(within(pane).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    }
    expect(container.firstElementChild).toHaveClass('@container');
    expect(container.querySelector('.grid')).toHaveClass('@4xl:grid-cols-2');
    await expectAccessible(container);
  });
});

describe('DensityPair', () => {
  it('renders its content once on a comfortable surface and once on a compact one, with no theme of its own', () => {
    const { container } = render(<DensityPair><Probe /></DensityPair>);
    const comfortable = screen.getByRole('group', { name: 'Comfortable, for sites' });
    const compact = screen.getByRole('group', { name: 'Compact, for applications' });
    expect(within(comfortable).getByRole('status')).toHaveTextContent('comfortable');
    expect(within(compact).getByRole('status')).toHaveTextContent('compact');
    expect(container.querySelector('[data-theme]')).toBeNull();
  });
});

describe('token specimens', () => {
  it('lists color swatches by token name, each as text beside a decorative swatch', async () => {
    const { container } = render(<ColorSwatches label="Six hue roles" colors={['hue-1', 'hue-2', 'sage']} />);
    const list = screen.getByRole('list', { name: 'Six hue roles' });
    expect(within(list).getAllByRole('listitem').map(li => li.textContent)).toEqual(['hue-1', 'hue-2', 'sage']);
    expect(list.querySelectorAll('[aria-hidden="true"].bg-hue-1, [aria-hidden="true"].bg-hue-2, [aria-hidden="true"].bg-sage')).toHaveLength(3);
    await expectAccessible(container);
  });

  it('shows the six type sizes and the tabular figures, one row each', async () => {
    const { container } = render(<TypeScaleSample />);
    const rows = within(screen.getByRole('list', { name: 'Type scale' })).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    for (const size of ['display', 'title', 'heading', 'lead', 'body', 'meta']) expect(container.querySelector(`.text-${size}`), size).not.toBeNull();
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('1,284');
    await expectAccessible(container);
  });

  it('shows the three shadow levels on window-shaped outlines and the three radii as outlines, with no fill', async () => {
    const { container } = render(<><ElevationSample /><RadiusSample /></>);
    const levels = within(screen.getByRole('list', { name: 'Elevation levels' })).getAllByRole('listitem');
    expect(levels.map(li => li.textContent)).toEqual(['shadow-rest', 'shadow-raised', 'shadow-float']);
    for (const level of levels) expect(level).toHaveClass('rounded-window');
    const radii = within(screen.getByRole('list', { name: 'Radii' })).getAllByRole('listitem');
    expect(radii.map(li => li.textContent)).toEqual(['rounded-control', 'rounded-pill', 'rounded-window']);
    expect(container.innerHTML).not.toMatch(/bg-(tone|field|mist)/);
    await expectAccessible(container);
  });
});

describe('demo targets', () => {
  it('passes the ref of a resizable region and of a draw-on drawing to the element a hook measures or arms', () => {
    const region = createRef<HTMLDivElement>();
    const drawing = createRef<SVGSVGElement>();
    render(<><ResizableSample ref={region}>x</ResizableSample><DrawOnSample ref={drawing} /></>);
    expect(region.current).toHaveClass('resize-x', 'overflow-auto');
    expect(drawing.current).toHaveClass('art');
    expect(drawing.current).toHaveAttribute('aria-hidden', 'true');
    expect(drawing.current!.querySelectorAll('path[pathLength="1"]')).toHaveLength(3);
  });
});
