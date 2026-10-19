import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-helpers';
import { CliHeroWindow, ProductHero, ProductHeroStage } from '.';

describe('ProductHero', () => {
  it('has one h1, three decorative windows, and hides nothing without scripts', () => {
    const { container } = render(<ProductHero title="Small experiments, useful things.">Copy.</ProductHero>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const windows = container.querySelectorAll('[data-window]');
    expect(windows).toHaveLength(3);
    windows.forEach((w) => expect(w).toHaveAttribute('aria-hidden', 'true'));
    expect(container.querySelector('[data-reveal="pending"], [hidden], [style*="opacity: 0"]')).toBeNull();
  });

  it('ProductHeroStage shows only the windows it is given, with the same hero', () => {
    const { container } = render(<ProductHeroStage title="Small experiments" windows={<CliHeroWindow />}>Copy.</ProductHeroStage>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const windows = container.querySelectorAll('[data-window]');
    expect(windows).toHaveLength(1);
    expect(windows[0]).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toContain('ejm-cli');
    expect(container.textContent).not.toContain('ejm-ide');
  });
});

