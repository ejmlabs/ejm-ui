/** The same control choices accepted by the React Button. Sizes are `md` and `icon`. */
export interface ButtonRecipeProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'danger' | null;
  size?: 'md' | 'icon' | null;
  density?: 'comfortable' | 'compact' | null;
}

/** The same field choices accepted by the React Input, Select and Textarea. */
export interface FieldRecipeProps {
  kind?: 'line' | 'area' | null;
  density?: 'comfortable' | 'compact' | null;
}

export declare const buttonBaseClass: string;
export declare const buttonGhostClass: string;
export declare const buttonMediumClass: string;

export declare const buttonVariants: (props?: ButtonRecipeProps) => string;
export declare const fieldVariants: (props?: FieldRecipeProps) => string;
export declare const fieldClass: string;
