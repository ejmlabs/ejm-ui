import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KeyHints } from './KeyHints';
import { expectAccessible, renderIn, themes } from './test-setup';

const hints = [{ key: 'Enter', label: 'run' }, { key: 'Esc', label: 'cancel' }, { key: '?', label: 'help' }];

describe('KeyHints', () => {
  it('lists every pair in the order given, keys first', () => {
    render(<KeyHints hints={hints} />);
    const items = within(screen.getByRole('list', { name: 'Keyboard shortcuts' })).getAllByRole('listitem');
    expect(items.map(i => i.textContent)).toEqual(['Enter run', 'Esc cancel', '? help']);
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(theme, <KeyHints hints={hints} />);
    await expectAccessible(container);
  });
});
