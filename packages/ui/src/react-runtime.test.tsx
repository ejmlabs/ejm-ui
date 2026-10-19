import { Slot } from '@radix-ui/react-slot';
import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';
import { describe, expect, it } from 'vitest';
import { cn } from './lib/utils';

// Task 1.3: forwardRef and a Radix primitive run on the project's React 19.
const Button = forwardRef<HTMLButtonElement, { asChild?: boolean; children?: unknown }>(function Button({ asChild, children }, ref) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref as never}>{children as never}</Comp>;
});

describe('react runtime', () => {
  it('runs forwardRef and a Radix Slot under React', () => {
    let node: HTMLButtonElement | null = null;
    render(<Button ref={(n: HTMLButtonElement | null) => { node = n; }}>Plain</Button>);
    expect(screen.getByText('Plain').tagName).toBe('BUTTON');
    expect(node).not.toBeNull();
    render(<Button asChild><a href="/x">Linked</a></Button>);
    expect(screen.getByText('Linked').tagName).toBe('A');
  });
  it('merges Tailwind classes', () => {
    expect(cn('px-2 px-4', false && 'x', 'text-sm')).toBe('px-4 text-sm');
  });
});
