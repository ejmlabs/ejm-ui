import { cva } from 'class-variance-authority';

// One control system (packages/ui/THEME.md, "The control system"). Every control is 44px tall at 16px type. Compact is 32px on a fine
// pointer at 14px type; touch-target keeps the target at 44px on a coarse pointer. Each recipe emits exactly one height, so no class string
// carries two values for the same property.
const comfortable = 'min-h-11 text-base';
const compact = 'min-h-8 compact-target text-sm';
const withLabel = ['primary', 'secondary', 'ghost', 'danger'];

/** The parts of a fixed native button. The pressed state is the only scale in the kit; the global :focus-visible outline is the focus ring. */
export const buttonBaseClass = 'group inline-flex items-center justify-center gap-2 font-semibold select-none touch-target transition-transform duration-fast ease-standard motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';
export const buttonGhostClass = 'rounded-pill whitespace-nowrap text-fg hover:bg-tone';
export const buttonMediumClass = 'min-h-11 px-6 text-base';

/** The one button. Filled variants darken to their hover token; the others fill with `bg-tone`. Sizes are `md` and `icon`. */
export const buttonVariants = /* @__PURE__ */ cva(
  buttonBaseClass,
  {
    variants: {
      variant: {
        primary: 'rounded-pill whitespace-nowrap bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary-hover',
        secondary: 'rounded-pill whitespace-nowrap border border-control text-fg hover:bg-tone',
        ghost: buttonGhostClass,
        link: 'rounded-control text-start text-link underline decoration-1 underline-offset-[0.2em] hover:decoration-2',
        danger: 'rounded-pill whitespace-nowrap bg-danger text-on-danger hover:bg-danger/85',
      },
      size: { md: '', icon: 'p-0' },
      density: { comfortable: '', compact: '' },
    },
    compoundVariants: [
      { size: 'md', density: 'comfortable', className: comfortable },
      { size: 'md', density: 'compact', className: compact },
      { size: 'md', density: 'comfortable', variant: withLabel, className: 'px-6' },
      { size: 'md', density: 'compact', variant: withLabel, className: 'px-4' },
      { size: 'md', variant: 'link', className: 'px-0' },
      // The kit sizes the icon, so a lucide-react icon needs no size of its own: 20px, or 16px compact (as in ThemeToggle).
      { size: 'icon', density: 'comfortable', className: 'size-11 text-base [&_svg]:size-5 [&_svg]:shrink-0' },
      { size: 'icon', density: 'compact', className: 'size-8 compact-target text-sm [&_svg]:size-4 [&_svg]:shrink-0' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', density: 'comfortable' },
  },
);

/** The field look shared by Input, Select and Textarea: `line` is a single row (44px, 32px compact), `area` is the multi-line box (`min-h-28`). */
export const fieldVariants = /* @__PURE__ */ cva(
  'block w-full rounded-control border border-control bg-field px-3 text-fg placeholder:text-muted touch-target disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-[invalid=true]:border-danger',
  {
    variants: {
      kind: { line: '', area: 'min-h-28 resize-y py-2.5' },
      density: { comfortable: 'text-base', compact: 'text-sm' },
    },
    compoundVariants: [
      { kind: 'line', density: 'comfortable', className: 'min-h-11' },
      { kind: 'line', density: 'compact', className: 'min-h-8 compact-target' },
    ],
    defaultVariants: { kind: 'line', density: 'comfortable' },
  },
);

/** The comfortable single-row field, for native markup that cannot use the React components. */
export const fieldClass = /* @__PURE__ */ fieldVariants();
