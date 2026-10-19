import { tokenize as tokenizeCore, type Run } from './highlight';
import { moreGrammars } from './highlight-more';

export { languageName } from './highlight';
export type { Role, Run } from './highlight';

/** `tokenize` with every language: the core set of highlight.ts plus Python, PowerShell and TOML. What CodeBlock and `@ejm/ui/docs` use. */
export const tokenize = (code: string, lang?: string): Run[] => tokenizeCore(code, lang, moreGrammars);
