import { useMediaQuery } from './useMediaQuery';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the visitor asks for reduced motion. Use it for motion done in script; CSS animations already switch off. */
export const useReducedMotion = (): boolean => useMediaQuery(REDUCED_MOTION_QUERY);
