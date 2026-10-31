export interface RuleProps {
  /** A mono label that sits on the line, left aligned. */
  label?: string;
}

/** A single hairline that separates groups. Never a box edge. A list that opens with a hairline (Facts, Rows) right after a labelled
 *  Rule does not draw its own, so the label's line is the only one. */
export function Rule({ label }: RuleProps) {
  if (!label) return <hr className="border-0 border-t border-line" />;
  return (
    <div role="separator" aria-label={label} data-rule="" className="flex items-center gap-4">
      <span aria-hidden="true" className="text-meta text-muted">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
