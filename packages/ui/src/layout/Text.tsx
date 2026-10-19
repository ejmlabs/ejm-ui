import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export type TextVariant = 'default' | 'muted' | 'strong' | 'code';

const variants: Record<TextVariant, string> = {
  default: '',
  muted: 'text-muted',
  strong: 'font-semibold',
  code: 'font-mono text-[0.92em] text-muted',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: 'span' | 'p' | 'div' | 'code' | 'strong';
}

/** A run of text. The variant sets the emphasis: default, muted, strong or code (mono, dim). */
export function Text({ variant = 'default', as: Tag = 'span', className, ...rest }: TextProps) {
  return <Tag className={cn(variants[variant], className)} {...rest} />;
}
