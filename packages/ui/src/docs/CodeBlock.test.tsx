import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { CodeBlock } from './CodeBlock';

const code = "const a = 1;\nconsole.log('x');\n";

describe('CodeBlock', () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('names its language and offers the code in a labelled, focusable scroll region', async () => {
    const { container } = render(<CodeBlock code={code} lang="ts" />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'TypeScript code' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toContain('overflow-x-auto');
    await expectAccessible(container);
  });

  it('copies the exact code, shows Copied and says so in a live region, then returns to Copy', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CodeBlock code={code} lang="ts" />);
    await user.click(screen.getByRole('button', { name: 'Copy TypeScript code' }));
    expect(await navigator.clipboard.readText()).toBe("const a = 1;\nconsole.log('x');");
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Copied/);
    await act(async () => void vi.advanceTimersByTime(2500));
    expect(screen.getByRole('button', { name: 'Copy TypeScript code' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('selects the code and says copying failed when the clipboard is blocked', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<CodeBlock code={code} lang="ts" />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Could not copy');
    expect(getSelection()?.toString()).toContain('const a = 1;');
  });

  it('has no copy button in the server HTML, only readable highlighted code', () => {
    const html = renderToString(<CodeBlock code={code} lang="ts" />);
    expect(html).not.toContain('<button');
    expect(html).toContain('data-r="k"');
    expect(html).toContain('console');
  });
});
