#!/usr/bin/env node
/**
 * Tailwind silently drops a class it cannot build, so a typo or a removed token (`bg-surface`, `text-stat`) renders unstyled
 * with no error. This finds every class string the kit writes (className and class attributes with the cn, cva and clsx
 * calls inside them, cva recipes, and variables whose name says class) and fails on any token that styles.css does not turn into CSS.
 * Usage: node packages/ui/scripts/check-classes.mjs   (exit 1 on a failure)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseSync } from 'vite';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const require = createRequire(import.meta.url);
const { compile } = await import(pathToFileURL(require.resolve('@tailwindcss/node')).href);

/** Marker classes that select or group without styling by themselves. */
const MARKERS = new Set(['group', 'peer', 'art', 'art-accent', 'art-fill', 'dark']);
const CLASS_CALLS = new Set(['cn', 'cva', 'clsx', 'twMerge']);

const walkFiles = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walkFiles(join(d, n)) : [join(d, n)]));
const sources = walkFiles(src).filter(f => /\.(tsx?|mjs)$/.test(f) && !/\.test\.|test-setup|\.d\.mts$/.test(f) && !f.includes('/lib/merge-config'));

function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'comments' || key === 'errors') continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, fn));
    else if (value && typeof value === 'object') visit(value, fn);
  }
}

/** The class strings an expression can produce: literals, template text, both arms of a condition, the value side of && and
 *  ||, array elements, object values (cva variants) and nested class calls. Comparisons and other calls' arguments are names. */
function strings(node, out) {
  if (!node || typeof node !== 'object') return out;
  switch (node.type) {
    case 'Literal': if (typeof node.value === 'string') out.push([node.value, node.start]); break;
    case 'TemplateLiteral': for (const q of node.quasis) out.push([q.value.cooked ?? q.value.raw, q.start]); break;
    case 'JSXExpressionContainer': strings(node.expression, out); break;
    case 'ConditionalExpression': strings(node.consequent, out); strings(node.alternate, out); break;
    case 'LogicalExpression': if (node.operator !== '&&') strings(node.left, out); strings(node.right, out); break;
    case 'ArrayExpression': node.elements.forEach(e => strings(e, out)); break;
    case 'ObjectExpression': node.properties.forEach(p => strings(p.type === 'Property' ? p.value : p.argument, out)); break;
    case 'CallExpression':
      if (node.callee?.type !== 'Identifier' || !CLASS_CALLS.has(node.callee.name)) break;
      if (node.callee.name !== 'cva') { node.arguments.forEach(a => strings(a, out)); break; }
      // cva(base, { variants: { name: { value: classes } }, compoundVariants: [{ ..., className }], defaultVariants })
      strings(node.arguments[0], out);
      for (const p of node.arguments[1]?.properties ?? []) {
        if (p.key?.name === 'variants') for (const v of p.value.properties ?? []) strings(v.value, out);
        if (p.key?.name === 'compoundVariants') for (const c of p.value.elements ?? []) for (const q of c.properties ?? []) if (['className', 'class'].includes(q.key?.name)) strings(q.value, out);
      }
      break;
    case 'ParenthesizedExpression': case 'TSAsExpression': case 'TSSatisfiesExpression': strings(node.expression, out); break;
  }
  return out;
}

const found = new Map();
for (const file of sources) {
  const code = readFileSync(file, 'utf8');
  const parsed = parseSync(file, code, { lang: extname(file) === '.mjs' ? 'js' : extname(file) === '.ts' ? 'ts' : 'tsx' });
  if (parsed.errors.length) throw new Error(`${relative(src, file)}: ${parsed.errors[0].message}`);
  const hits = [];
  visit(parsed.program, n => {
    if (n.type === 'JSXAttribute' && ['className', 'class'].includes(n.name?.name)) strings(n.value, hits);
    const cvaInit = n.type === 'VariableDeclarator' && n.init?.type === 'CallExpression' && n.init.callee?.name === 'cva';
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && (/class|cls/i.test(n.id.name) || cvaInit) && n.init) strings(n.init, hits);
  });
  for (const [value, start] of hits) {
    for (const token of value.split(/\s+/)) {
      if (!token || token.includes('${') || MARKERS.has(token) || /^(group|peer)\//.test(token)) continue;
      if (!found.has(token)) found.set(token, `${relative(src, file)}:${code.slice(0, start).split('\n').length}`);
    }
  }
}

const compiler = await compile('@import "./styles.css";', { base: src, onDependency: () => {} });
let css = compiler.build([]);
const unknown = [];
for (const [token, where] of found) {
  const next = compiler.build([token]);
  if (next === css) unknown.push(`${where} ${token}`);
  css = next;
}
if (unknown.length) {
  console.error(unknown.map(u => `check-classes: no CSS for ${u}`).join('\n'));
  process.exit(1);
}
console.log(`check-classes ok: ${found.size} class names, each builds`);
