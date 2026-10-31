export interface RuleProps {
  /** A mono label that sits on the line, left aligned. */
  label?: string;
}

/** A single hairline that separates groups. Never a box edge. */
export function Rule({ label }: RuleProps) {
  if (!label) return <hr className="border-0 border-t border-line" />;
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-4">
      <span aria-hidden="true" className="text-meta text-muted">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
