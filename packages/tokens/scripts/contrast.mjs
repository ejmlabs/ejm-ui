// Contrast gates for theme.json. Pure functions: they read the theme object and return problems, so the generator
// runs them and tests can feed them a bad color. Run `node scripts/contrast.mjs --verbose` for every pair measured.
import { fileURLToPath } from 'node:url';
import { loadTheme, ratio, resolveBands, resolveThemes } from './theme.mjs';

// The ui theme: text, focus, control border, on-primary, syntax, terminal colors and hues, for both themes.
export function checkUi(theme, resolved = resolveThemes(theme)) {
  const problems = [];
  for (const [name, t] of Object.entries(resolved)) {
    for (const role of theme.contrast.text) for (const surface of theme.contrast.surfaces) {
      const value = ratio(t.roles[role], t.roles[surface]);
      if (value < 4.5) problems.push(`${name}: ${role} on ${surface} is ${value.toFixed(2)}:1, needs 4.5:1`);
    }
    for (const surface of theme.contrast.surfaces) {
      const value = ratio(t.roles.focus, t.roles[surface]);
      if (value < 3) problems.push(`${name}: focus on ${surface} is ${value.toFixed(2)}:1, needs 3:1`);
    }
    const cb = theme.contrast.controlBorder;
    for (const surface of cb.surfaces) {
      const value = ratio(t.roles[cb.role], t.roles[surface]);
      if (value < cb.min) problems.push(`${name}: ${cb.role} on ${surface} is ${value.toFixed(2)}:1, needs ${cb.min}:1`);
    }
    const subtle = ratio(t.roles['text-subtle'], t.roles.editor);
    if (subtle < theme.contrast.subtleMin) problems.push(`${name}: text-subtle on editor is ${subtle.toFixed(2)}:1`);
    if (ratio(t.roles.dim, t.roles.ground) < 4.5) problems.push(`${name}: terminal dim is under 4.5:1 on ground`);
    if (ratio(t.roles['on-primary'], t.roles.primary) < 4.5) problems.push(`${name}: on-primary on primary is under 4.5:1`);
    for (const [k, v] of Object.entries(t.syntax)) {
      const value = ratio(v, t.roles.editor);
      if (value < theme.contrast.syntaxMin) problems.push(`${name}: syntax ${k} on editor is ${value.toFixed(2)}:1`);
    }
    for (const k of ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']) {
      const value = ratio(t.ansi[k], t.roles.ground);
      if (value < 4.5) problems.push(`${name}: ansi ${k} on ground is ${value.toFixed(2)}:1`);
    }
    t.hues.forEach((h, i) => { if (ratio(h, t.roles.editor) < 3) problems.push(`${name}: hue ${i + 1} is under 3:1 on editor`); });
  }
  return problems;
}

// The web bands: for each of paper, mist, sage and ink, in light and dark, every foreground against the grounds it sits on.
// Returns { problems, rows }; rows is every pair measured, for the verbose report.
export function checkBands(theme, brand, resolved = resolveThemes(theme)) {
  const g = theme.contrast.web;
  const bands = resolveBands(theme, brand, resolved);
  const problems = [];
  const rows = [];
  const need = (label, fg, bg, min) => {
    const value = ratio(fg, bg);
    rows.push({ label, value, min });
    if (value < min) problems.push(`${label} is ${value.toFixed(2)}:1, needs ${min}:1`);
  };
  for (const [band, modes] of Object.entries(bands)) {
    for (const [mode, s] of Object.entries(modes)) {
      const at = `${band}/${mode}:`;
      for (const [on, bg] of [['ground', s.ground], ['tone', s.tone], ['field', s.field]]) {
        need(`${at} fg on ${on}`, s.fg, bg, g.text);
        need(`${at} muted on ${on}`, s.muted, bg, g.text);
        need(`${at} focus on ${on}`, s.focus, bg, g.focus);
      }
      for (const [on, bg] of [['ground', s.ground], ['tone', s.tone]]) {
        need(`${at} link on ${on}`, s.link, bg, g.text);
        for (const k of ['success', 'warn', 'danger', 'info']) need(`${at} ${k} on ${on}`, s[k], bg, g.text);
      }
      need(`${at} link-large on ground`, s.linkLarge, s.ground, g.large);
      need(`${at} control on ground`, s.control, s.ground, g.control);
      need(`${at} control on field`, s.control, s.field, g.control);
      need(`${at} line on ground`, s.line, s.ground, g.line);
      need(`${at} on-primary on primary`, s.onPrimary, s.primary, g.text);
      need(`${at} on-primary-hover on primary-hover`, s.onPrimaryHover, s.primaryHover, g.text);
      need(`${at} on-danger on danger`, s.onDanger, s.danger, g.text);
      need(`${at} on-code on code`, s.onCode, s.code, g.text);
      if (!(theme.contrast.web.noHues || []).includes(band)) {
        for (let i = 1; i <= 6; i++) need(`${at} hue-${i} on ground`, s[`hue${i}`], s.ground, g.graphic);
      }
    }
  }
  // Named pairs from the brand guide. Ink on Sage is the only text pair that works on Sage, and Forest on Sage is large type only.
  need('brand: Ink on Sage', brand.ink, brand.sage, g.text);
  need('brand: Forest on Sage (large type only)', brand.forest, brand.sage, g.large);
  // Sage and Ink bands never flip with the theme.
  for (const [band, ground] of [['sage', brand.sage], ['ink', brand.ink]]) {
    for (const mode of ['light', 'dark']) {
      if (bands[band][mode].ground !== ground) problems.push(`${band}/${mode}: the ${band} band must keep the brand ${band} ground in both themes`);
      if (JSON.stringify(bands[band].light) !== JSON.stringify(bands[band].dark)) problems.push(`${band}: light and dark values must be identical`);
    }
  }
  return { problems: [...new Set(problems)], rows };
}

export function checkAll(theme, brand = loadTheme().brand) {
  return [...checkUi(theme), ...checkBands(theme, brand).problems];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { theme, brand } = loadTheme();
  const { problems, rows } = checkBands(theme, brand);
  const all = [...checkUi(theme), ...problems];
  if (process.argv.includes('--verbose')) for (const r of rows) console.log(`${r.value.toFixed(2).padStart(6)}:1  (min ${r.min})  ${r.label}`);
  if (all.length) { console.error(all.join('\n')); process.exit(1); }
  const min = Math.min(...rows.map(r => r.value / r.min));
  console.log(`contrast ok: ui theme, and ${rows.length} band pairs (tightest margin ${(min).toFixed(2)}x its minimum)`);
}
