import { createContext, useContext, useId, type ReactNode } from 'react';
import { NextHeadingLevel, useHeadingTag } from '../lib/heading';
import { SectionHead } from './SectionHead';

export interface SectionProps {
  title: ReactNode;
  /** Mono kicker above the title, for example "01 / Projects". */
  kicker?: string;
  /** Lead copy beside the title (below it when narrow), in the same recipe as the children of `SectionHead`. */
  intro?: ReactNode;
  /** Buttons or links that follow the intro. */
  actions?: ReactNode;
  /** The section takes the Sage ground instead of alternating Mist and Paper. Ignored in a nested section. */
  emphasis?: boolean;
  /** Names the heading. A generated id is used when it is omitted, and `aria-labelledby` always points at it. */
  id?: string;
  children?: ReactNode;
}

/** True below a top-level Section, so a Section inside another is a subsection without a band. */
const InsideSection = createContext(false);

// One column that may shrink below its content (a wide table scrolls inside itself rather than widening the page). Bare paragraphs
// and lists keep the reading measure; a part that has its own class (a Rows list, a Note) sizes itself.
const bodyMeasure = 'grid-cols-[minmax(0,1fr)] [&>p:not([class])]:max-w-measure [&>ul:not([class])]:max-w-measure [&>ol:not([class])]:max-w-measure';

/**
 * A page section: the way to build the parts of a page. The heading level, the ground, the id and the spacing are derived.
 * A top-level section is a full-bleed band that alternates Mist and Paper (Sage with `emphasis`), with the section opening and a
 * body in one fixed rhythm. A section inside a section is a subsection: no band, its title one level down in heading type.
 */
export function Section({ title, kicker, intro, actions, emphasis = false, id, children }: SectionProps) {
  const generated = useId();
  const headingId = id ?? generated;
  const nested = useContext(InsideSection);
  const Heading = useHeadingTag();
  const body = (
    <InsideSection.Provider value>
      <NextHeadingLevel>{children}</NextHeadingLevel>
    </InsideSection.Provider>
  );
  const buttons = actions && <div className="flex flex-wrap items-center gap-x-8 gap-y-4">{actions}</div>;
  const lead = intro || buttons ? <>{intro}{buttons}</> : undefined;

  if (nested) {
    return (
      <section aria-labelledby={headingId} className="min-w-0">
        <header className="grid max-w-measure gap-3">
          {kicker && <p className="text-meta text-muted">{kicker}</p>}
          <Heading id={headingId} className="text-heading">{title}</Heading>
          {lead}
        </header>
        {children && <div className={`mt-6 grid gap-6 ${bodyMeasure}`}>{body}</div>}
      </section>
    );
  }

  return (
    <section data-band={emphasis ? 'sage' : 'auto'} aria-labelledby={headingId} className="band py-rhythm">
      <div className="page">
        <SectionHead as={Heading} id={headingId} kicker={kicker} title={title}>{lead}</SectionHead>
        {children && <div className={`mt-16 grid gap-16 ${bodyMeasure}`}>{body}</div>}
      </div>
    </section>
  );
}
