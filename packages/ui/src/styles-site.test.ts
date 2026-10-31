// @vitest-environment node
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { expect, it } from 'vitest';

it.each(['styles.css', 'ide.css'])('ships responsive product windows through the public %s profile', async profile => {
  const compiler = await compile(`@import "@ejm/ui/styles-site.css" source(none);\n@import "@ejm/demos/${profile}";`, {
    base: fileURLToPath(new URL('./', import.meta.url)),
    onDependency() {},
  });
  // Use only the public profiles' sources. Supplied class names would hide a missing owner source.
  const css = postcss.parse(compiler.build(new Scanner({ sources: compiler.sources }).scan()));
  const rules: { selector: string; query?: string; declarations: Record<string, string> }[] = [];
  css.walkRules(rule => {
    const declarations: Record<string, string> = {};
    rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; });
    const parent = rule.parent;
    rules.push({
      selector: rule.selector,
      query: parent?.type === 'atrule' && parent.name === 'container' ? parent.params : undefined,
      declarations,
    });
  });
  const emitted = (selector: string, query: string | undefined, declarations: Record<string, string>) => {
    expect(rules.filter(rule => rule.selector === selector), selector).toContainEqual({
      selector, query, declarations: expect.objectContaining(declarations),
    });
  };
  // Windows tuck into a stack on narrow stages and occupy fixed slots on wider stages.
  emitted('.ms-\\[6\\%\\]', undefined, { 'margin-inline-start': '6%' });
  emitted('.\\@md\\:absolute', '(width >= 28rem)', { position: 'absolute' });
  emitted('.\\@md\\:w-\\[66\\%\\]', '(width >= 28rem)', { width: '66%' });
  // Window labels and type follow the stage width rather than the page viewport.
  emitted('.\\@max-md\\:hidden', '(width < 28rem)', { display: 'none' });
  emitted('.\\@md\\:\\[--ejm-window-text\\:clamp\\(0\\.8125rem\\,1\\.9cqw\\,1\\.75rem\\)\\]', '(width >= 28rem)', {
    '--ejm-window-text': 'clamp(0.8125rem, 1.9cqw, 1.75rem)',
  });
});

it('draws one line where a labelled Rule meets a list, styles keys once, and folds a long nav at a wider container', async () => {
  const compiler = await compile('@import "@ejm/ui/styles.css";', { base: fileURLToPath(new URL('./', import.meta.url)), onDependency() {} });
  const css = compiler.build(['hairline-t', '@6xl:flex', '@6xl:hidden']);
  // A list that opens with a hairline drops it right after a labelled Rule, whose own line is the only one.
  expect(css).toMatch(/\.hairline-t\s*\{\s*border-block-start:[^;]+;\s*\[data-rule\]\s*\+\s*&\s*\{\s*border-block-start-width:\s*0/);
  // A key is an outlined cap in the mono face; a combination is a kbd of kbds and only the inner keys are outlined.
  expect(css).toMatch(/:where\(kbd\):not\(:has\(kbd\)\)\s*\{[^}]*border:\s*1px solid var\(--ejm-line\)/);
  // The size steps down once: a key inside a combination is the same size as a key on its own.
  expect(css).toMatch(/:where\(kbd kbd\)\s*\{\s*font-size:\s*1em/);
  // The Header's widest folds are generated.
  expect(css).toMatch(/@container \(width >= 72rem\)\s*\{\s*\.\\@6xl\\:flex/);
});
