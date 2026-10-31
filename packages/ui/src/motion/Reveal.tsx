import type { AriaAttributes, CSSProperties, ElementType, ReactNode, Ref } from 'react';
import { useReveal } from './useReveal';

export type RevealFrom = 'up' | 'fade' | 'scale' | 'left';

/** The elements a motion wrapper can be. A wrapper adds no class from outside: the kit owns the entrance. */
export type MotionTag = 'div' | 'section' | 'ul' | 'ol' | 'li';

/** What a motion wrapper accepts besides its effect props: children, an id and ARIA attributes, so it can be labelled or referenced. */
export type MotionElementProps = AriaAttributes & { id?: string; children?: ReactNode };

/** The CSS variables for a staggered step. The index stops at 8, so a staged entrance is at most 8 x 60 + 640 = 1120ms. */
export const staggerStyle = (index: number, delayMs?: number): CSSProperties =>
  ({ '--ejm-i': Math.min(Math.max(Math.trunc(index) || 0, 0), 8), ...(delayMs ? { '--ejm-delay': `${delayMs}ms` } : null) }) as CSSProperties;

export type RevealProps = MotionElementProps & { as?: MotionTag; from?: RevealFrom; index?: number; delay?: number };

/**
 * Plays a short entrance once, when the element scrolls into view. Use `index` to stagger siblings (0 to 8) and
 * `delay` (ms) for a fixed wait. Content is always in the final state without scripts or under reduced motion.
 * `as` is `div` (default), `section`, `ul`, `ol` or `li`. It takes no class or style.
 */
export function Reveal({ as, from = 'up', index, delay, ...rest }: RevealProps) {
  const ref = useReveal();
  const Tag = (as ?? 'div') as ElementType;
  return <Tag ref={ref as Ref<HTMLElement>} data-reveal-from={from === 'up' ? undefined : from} style={index !== undefined || delay ? staggerStyle(index ?? 0, delay) : undefined} {...rest} />;
}
