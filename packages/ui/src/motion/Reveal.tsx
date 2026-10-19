import type { ComponentPropsWithoutRef, CSSProperties, ElementType, Ref } from 'react';
import { useReveal } from './useReveal';

export type RevealFrom = 'up' | 'fade' | 'scale' | 'left';

/** The CSS variables for a staggered step. The index stops at 8, so a staged entrance is at most 8 x 60 + 640 = 1120ms. */
export const staggerStyle = (index: number, delayMs?: number): CSSProperties =>
  ({ '--ejm-i': Math.min(Math.max(Math.trunc(index) || 0, 0), 8), ...(delayMs ? { '--ejm-delay': `${delayMs}ms` } : null) }) as CSSProperties;

export type RevealProps<T extends ElementType = 'div'> = { as?: T; from?: RevealFrom; index?: number; delay?: number } & Omit<ComponentPropsWithoutRef<T>, 'as'>;

/**
 * Plays a short entrance once, when the element scrolls into view. Use `index` to stagger siblings (0 to 8) and
 * `delay` (ms) for a fixed wait. Content is always in the final state without scripts or under reduced motion.
 */
export function Reveal<T extends ElementType = 'div'>({ as, from = 'up', index, delay, style, ...rest }: RevealProps<T>) {
  const ref = useReveal();
  const Tag = (as ?? 'div') as ElementType;
  return <Tag ref={ref as Ref<HTMLElement>} data-reveal-from={from === 'up' ? undefined : from} style={{ ...(index !== undefined || delay ? staggerStyle(index ?? 0, delay) : null), ...(style as CSSProperties) }} {...rest} />;
}
