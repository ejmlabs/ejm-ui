import { createContext, useId, type HTMLAttributes, type ReactNode } from 'react';

export type ShowcaseFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'dangerouslySetInnerHTML'> & {
  label: string;
  note?: ReactNode;
};

/** True inside a ShowcaseFrame that shows a note, which is then the demo's one disclosure: an interactive island leaves out its own. */
export const InShowcaseFrame = createContext(false);

/** One nearby disclosure for a passive example or an island. It is in the prerendered page, so it is there without scripts. Controls sit outside the product surface. It fills its column up to its maximum width, so a Section body needs no wrapper. */
export function ShowcaseFrame({ label, note = 'Example session. Runs in your browser without a model connection.', children, ...props }: ShowcaseFrameProps) {
  const noteId = useId();
  return <div {...props} role="group" aria-label={label} aria-describedby={note ? noteId : undefined} className="mx-auto w-full min-w-0 max-w-6xl">
    <InShowcaseFrame.Provider value={Boolean(note)}>{children}</InShowcaseFrame.Provider>
    {note && <p id={noteId} className="mt-4 text-meta text-muted">{note}</p>}
  </div>;
}
