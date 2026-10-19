import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LazyCliDemo } from './cli-lazy';
import { LazyHarnessDemo } from './harness-lazy';
import { LazyDemo } from './LazyDemo';
import { renderIn } from '../test-helpers';

type Callback = (entries: { isIntersecting: boolean }[]) => void;
const observers: Callback[] = [];
const stubObserver = () =>
  vi.stubGlobal('IntersectionObserver', class { constructor(cb: Callback) { observers.push(cb); } observe() {} unobserve() {} disconnect() {} });
afterEach(() => { vi.unstubAllGlobals(); observers.length = 0; });

describe('LazyDemo', () => {
  it('serves the static view, which is the complete page without scripts, and no live demo', () => {
    stubObserver();
    renderIn('light', <LazyDemo product="cli" />);
    expect(screen.getByRole('group', { name: 'ejm-cli, a simulated screen' })).toHaveTextContent('blocked: write access is not granted');
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
    expect(screen.getAllByText('Simulated screen').length).toBeGreaterThan(0);
  });

  it('loads the island when the demo nears the viewport', async () => {
    stubObserver();
    renderIn('light', <LazyDemo product="cli" />);
    await act(async () => observers.forEach((cb) => cb([{ isIntersecting: true }])));
    expect(await screen.findByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  });

  it('loads the island on first use even when it was never near the viewport', async () => {
    stubObserver();
    const user = userEvent.setup();
    renderIn('light', <LazyDemo product="harness" />);
    await user.click(await screen.findByRole('button', { name: 'Try the live demo' }));
    expect(await screen.findByRole('slider', { name: 'Max concurrent' })).toBeInTheDocument();
  });

  it('has a per-product entry that serves only its own static view, complete, and loads its island on approach', async () => {
    stubObserver();
    renderIn('light', <LazyCliDemo />);
    expect(screen.getByRole('group', { name: 'ejm-cli, a simulated screen' })).toHaveTextContent('blocked: write access is not granted');
    expect(screen.queryByRole('group', { name: /ejm-ide|ejm-harness/ })).toBeNull();
    await act(async () => observers.forEach((cb) => cb([{ isIntersecting: true }])));
    expect(await screen.findByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  });

  it('loads the harness island from its own entry on first use', async () => {
    stubObserver();
    const user = userEvent.setup();
    renderIn('light', <LazyHarnessDemo />);
    await user.click(await screen.findByRole('button', { name: 'Try the live demo' }));
    expect(await screen.findByRole('slider', { name: 'Max concurrent' })).toBeInTheDocument();
  });
});

