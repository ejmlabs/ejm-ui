// Shared by every component test: jest-dom and vitest-axe matchers, cleanup, and a theme wrapper.
// jsdom loads no CSS, so the light and dark runs prove that a component renders and passes the structural accessibility rules
// with the theme attribute in place. Contrast itself is gated by packages/tokens/scripts/contrast.mjs.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import { configureAxe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';
import type { ReactElement } from 'react';

// color-contrast needs real layout and styles, which jsdom has not: the contrast script gates it instead.
// region is a page-level rule (content inside landmarks); these tests render fragments.
const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });

expect.extend(axeMatchers);

// jsdom lacks a few browser APIs that Radix positioning and menus call. Stubs only; nothing here fakes a component.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
afterEach(cleanup);

export type ThemeName = 'light' | 'dark';
export const themes: ThemeName[] = ['light', 'dark'];

/** Render inside a `data-theme` ancestor on a paper band, the way a page does. */
export function renderIn(theme: ThemeName, ui: ReactElement): RenderResult {
  return render(<div data-theme={theme} data-band="paper" className="band">{ui}</div>);
}

/** Assert no axe violations for the rendered container. */
export async function expectAccessible(container: HTMLElement) {
  (expect(await axe(container)) as unknown as AxeMatchers).toHaveNoViolations();
}
