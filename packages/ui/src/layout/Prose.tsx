import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface ProseProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div';
}

/** Shared reading typography for semantic prose, without a highlighter or client state. */
export function Prose({ as: Tag = 'div', className, ...props }: ProseProps) {
  return <Tag className={cn('prose-content', className)} {...props} />;
}
