import { Children, cloneElement, isValidElement, type CSSProperties, type ElementType, type ReactElement, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { staggerStyle, type MotionElementProps, type MotionTag } from './Reveal';

// Literal class names so Tailwind finds them.
const effects = { enter: 'animate-enter', reveal: 'animate-reveal', fade: 'animate-fade' } as const;

export type StaggerProps = MotionElementProps & { as?: MotionTag; effect?: keyof typeof effects };

/**
 * A staged entrance for the elements that are on screen at load (a hero, a page heading and its first rows). Each child
 * element gets the effect class and its position in --ejm-i, so they arrive one after another in under 1.2 seconds.
 * It is CSS only: with no scripts or with reduced motion every child is simply there. For content further down the
 * page use Reveal with `index`. `as` is `div` (default), `section`, `ul`, `ol` or `li`. It takes no class or style.
 */
export function Stagger({ as, effect = 'enter', children, ...rest }: StaggerProps) {
  const Tag = (as ?? 'div') as ElementType;
  let i = 0;
  return (
    <Tag {...rest}>
      {Children.map(children as ReactNode, child => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ className?: string; style?: CSSProperties }>;
        return cloneElement(el, { className: cn(effects[effect], el.props.className), style: { ...staggerStyle(i++), ...el.props.style } });
      })}
    </Tag>
  );
}
