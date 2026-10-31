import type { HTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';

export type TextVariant = 'default' | 'muted' | 'strong' | 'code';

const variants: Record<TextVariant, string | undefined> = {
  default: undefined,
  muted: 'text-muted',
  strong: 'font-semibold',
  code: undefined,
};

export interface TextProps extends Closed<HTMLAttributes<HTMLElement>> {
  variant?: TextVariant;
  /** The element. The `code` variant always renders a `code` element, which takes the base inline code style (mono, no fill). */
  as?: 'span' | 'p' | 'div' | 'code' | 'strong';
}

/** A run of text. The variant sets the emphasis: default, muted, strong or code (the base inline code style). */
export function Text({ variant = 'default', as, ...rest }: TextProps) {
  const Tag = variant === 'code' ? 'code' : (as ?? 'span');
  return <Tag {...rest} className={variants[variant]} />;
}
