/**
 * How tight a control is. `comfortable` (the default) is the marketing-site size. `compact` is for applications: smaller type, the
 * 5px `rounded-compact` radius and, on a fine pointer, 32px targets. On a coarse pointer (touch) a target is still 44px, through `touch-target`.
 */
export type Density = 'comfortable' | 'compact';
