/**
 * The grammars beyond the core set of highlight.ts: Python, PowerShell and TOML. Kept apart so a page that only needs TypeScript, Rust, CSS, shell, JSON or HTML
 * (the product views of @ejm/demos) does not carry them. `tokenize` from highlight-all.ts, the docs entry and CodeBlock include them.
 */
import { num, sticky, words, type Grammars, type Rule } from './highlight';

const hashComment = sticky(/#[^\n]*/);
const py: Rule[] = [
  ['c', hashComment],
  ['s', sticky(/\b[rbfuRBFU]{0,2}(?:\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/)],
  ['n', num],
  ['m', sticky(/@[A-Za-z_][\w.]*/)],
  ['k', words('def class import from as return if elif else for while in not and or is lambda with try except finally raise yield pass break continue global nonlocal async await del assert match case')],
  ['v', words('True False None')],
  ['t', sticky(/\b[A-Z][\w]*/)],
  ['f', sticky(/[A-Za-z_]\w*(?=\()/)],
];
const ps: Rule[] = [
  ['c', sticky(/<#[\s\S]*?#>|#[^\n]*/)],
  ['s', sticky(/"(?:[^"`\n]|`.)*"|'(?:[^'\n]|'')*'/)],
  ['v', sticky(/\$\{[^}\n]*\}|\$(?:\w+:)?\w+/)],
  ['k', sticky(/\b(?:function|param|if|elseif|else|foreach|for|while|do|until|switch|return|try|catch|finally|throw|begin|process|end|in|break|continue|exit)\b/i)],
  ['f', sticky(/\b[A-Z][a-z]+-[A-Z][\w]*/)],
  ['p', sticky(/(?<=\s)-[A-Za-z][\w]*/)],
  ['n', num],
];
const toml: Rule[] = [
  ['c', hashComment],
  ['s', sticky(/\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'[^'\n]*'/)],
  ['k', sticky(/(?<=(?:^|\n)[ \t]*)\[\[?[^\]\n]+\]\]?/)],
  ['p', sticky(/(?<=(?:^|\n)[ \t]*)[\w.-]+(?=[ \t]*=)/)],
  ['v', words('true false inf nan')],
  ['n', sticky(/\b\d{4}-\d\d-\d\d(?:[Tt ][\d:.]+(?:Z|[+-][\d:]+)?)?\b|[+-]?\b0x[\dA-Fa-f_]+\b|[+-]?\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b/)],
];


export const moreGrammars: Grammars = { py, python: py, ps1: ps, powershell: ps, pwsh: ps, toml };
