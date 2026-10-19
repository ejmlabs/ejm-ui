import { cn } from '../lib/utils';

export interface RuleProps {
  /** A mono label that sits on the line, left aligned. */
  label?: string;
  className?: string;
}

/** A single hairline that separates groups. Never a box edge. */
export function Rule({ label, className }: RuleProps) {
  if (!label) return <hr className={cn('border-0 border-t border-line', className)} />;
  return (
    <div role="separator" aria-label={label} className={cn('flex items-center gap-4', className)}>
      <span aria-hidden="true" className="text-meta text-muted">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
