import { expect, it } from 'vitest';
import type * as ui from './index';

/**
 * The kit owns every class and style. A capitalized export of the barrel whose props accept className, style or raw HTML is an
 * escape hatch: its name lands in Open, and the assignment below stops type checking with the name in the error.
 */
type Exports = typeof ui;
type PropsOf<T> = T extends (props: infer P, ...rest: never[]) => unknown ? P : never;
type Opens<P> = [P] extends [never] ? false : P extends object ? ('className' | 'style' | 'dangerouslySetInnerHTML') & keyof P extends never ? false : true : false;
type Open = { [K in keyof Exports]: K extends Capitalize<string> ? (Opens<PropsOf<Exports[K]>> extends true ? K : never) : never }[keyof Exports];

const none: [Open] extends [never] ? 'closed' : `open: ${Open}` = 'closed';

it('closes every public component to class, style and raw HTML overrides', () => {
  expect(none).toBe('closed');
});
