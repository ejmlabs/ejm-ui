/**
 * The one look for the links of a docs list, shared by DocsSidebar and Contents. A hairline runs down the left edge. Hover fills the
 * row with tone, and the current entry takes the strong rule, the tone and the strong text, so it never rests on color alone. Entries
 * are 32px tall with a mouse and 44px on touch. The lists sit in a scroll container, so the focus outline goes inside the row.
 */
export const navLinkClass =
  'touch-target compact-target flex min-h-8 items-center rounded-e-control border-s border-line py-1 ps-4 text-sm leading-snug text-muted no-underline hover:bg-tone hover:text-fg focus-visible:outline-offset-[-2px] aria-[current]:border-fg aria-[current]:bg-tone aria-[current]:text-fg';
