/**
 * Public component props carry content, state, identity and accessible attributes. Visual overrides never cross the package
 * boundary: the kit owns every class and style. closed-api.test.ts fails when an exported component accepts one of these keys.
 */
export type Closed<P> = Omit<P, 'className' | 'style' | 'dangerouslySetInnerHTML'>;
