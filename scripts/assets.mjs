#!/usr/bin/env node
// Import selected brand assets from the old design-kit and verify their provenance.
//
//   node scripts/assets.mjs            verify: every row of PROVENANCE.md matches its file here and, when the
//                                      design-kit is present, its source there (exit 1 on any mismatch)
//   node scripts/assets.mjs --local    verify the files here against PROVENANCE.md only (used by `npm run check`,
//                                      so a change in the old kit never breaks this repo)
//   node scripts/assets.mjs --sync     copy from the design-kit and rewrite PROVENANCE.md (the only way it is written)
//
// The design-kit is read only. Its location is $EJM_DESIGN_KIT, else ../ejmlabs/design-kit next to this repo.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = join(repo, 'packages', 'tokens');
const kit = process.env.EJM_DESIGN_KIT || join(repo, '..', 'ejmlabs', 'design-kit');
const provenance = join(tokens, 'assets', 'PROVENANCE.md');

// [source path in the design-kit, destination under packages/tokens].
// Retired kit handoff files, editable kit sources, and ZIP archives are excluded from imports.
const MOVES = [
  ['logos', 'assets/logos'], ['favicon', 'assets/favicon'], ['icons', 'assets/icons'], ['motifs', 'assets/motifs'],
  ['social', 'assets/social'], ['lockups', 'assets/lockups'], ['templates', 'assets/templates'], ['fonts', 'assets/fonts'],
  ['tokens/palette.json', 'assets/brand/palette.json'], ['tokens/design-tokens.json', 'assets/brand/design-tokens.json'],
  ['ui/rust/ejm_tui.rs', 'rust/ejm_tui.rs'], ['ui/TUI.md', 'rust/TUI.md'],
  // The regenerated per-project logo families (marks, logos, icons, favicons, social card). Their editable/ sources stay in the kit.
  ['projects/cli', 'assets/projects/cli'], ['projects/ide', 'assets/projects/ide'], ['projects/harness', 'assets/projects/harness'],
];
const retiredKitFiles = new Set([
  'social/x-kit/README.md', 'social/x-kit/index.html', 'social/x-kit/profile-copy.md',
]);
const skipped = rel => rel.split(/[\\/]/).includes('editable');

const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const walk = dir => readdirSync(dir).sort().flatMap(n => {
  const p = join(dir, n);
  if (n === '.DS_Store') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const posix = p => p.split('\\').join('/');

function plan() {
  const rows = [];
  for (const [from, to] of MOVES) {
    const src = join(kit, from);
    for (const file of statSync(src).isDirectory() ? walk(src) : [src]) {
      const rel = file === src ? '' : relative(src, file);
      const source = posix(join(from, rel));
      if (source.endsWith('.zip') || source.startsWith('social/x-kit/source/') || retiredKitFiles.has(source)) continue;
      if (from.startsWith('projects/') && skipped(rel)) continue;
      rows.push({ local: posix(join(to, rel)), source, file });
    }
  }
  return rows;
}

const args = process.argv.slice(2);
if (args.includes('--sync')) {
  if (!existsSync(kit)) { console.error(`design-kit not found at ${kit} (set EJM_DESIGN_KIT)`); process.exit(2); }
  const rows = plan();
  for (const r of rows) {
    const dest = join(tokens, r.local);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(r.file, dest);
    r.sha = sha(dest);
  }
  const edited = [
    ['ui/theme.json', 'packages/tokens/theme.json', 'extended with the `web` block (bands, elevation)'],
    ['scripts/build-ui.mjs', 'packages/tokens/scripts/build-ui.mjs', 'paths adapted, Tailwind output added, contrast gates moved to contrast.mjs'],
    ['scripts/build-art.mjs', 'packages/ui/scripts/build-art.mjs', 'paths adapted, inline classes renamed'],
    ['scripts/check-art.mjs', 'packages/ui/scripts/check-art.mjs', 'paths adapted, gradient surface section dropped'],
    ['scripts/shoot.mjs', 'scripts/shoot.mjs', 'docs and skip-link selectors updated'],
    ['QUALITY.md', 'QUALITY.md', 'commands updated, Performance section added'],
  ].map(([from, to, why]) => `| \`${from}\` | \`${to}\` | \`${sha(join(kit, from)).slice(0, 12)}\` | ${why} |`);
  writeFileSync(provenance, [
    '# Provenance',
    '',
    'Everything below was copied unchanged from the old `design-kit/` (read only) by `node scripts/assets.mjs --sync`.',
    'Do not edit this table by hand. `node scripts/assets.mjs` re-hashes every file here and, when the design-kit is present, every source.',
    'Paths are relative to `packages/tokens/` here and to `design-kit/` at the source.',
    'Retired kit handoff files, editable kit sources, and ZIP archives are excluded from imports.',
    '',
    '| File | Source | sha256 |',
    '| --- | --- | --- |',
    ...rows.map(r => `| \`${r.local}\` | \`${r.source}\` | \`${r.sha}\` |`),
    '',
    '## Moved and then edited',
    '',
    'These came from the design-kit too but were changed on purpose, so their hashes are not compared. The short hash is the original.',
    '',
    '| Source | Now | Original sha256 (12) | Change |',
    '| --- | --- | --- | --- |',
    ...edited,
    '',
  ].join('\n'));
  console.log(`copied ${rows.length} files, wrote ${relative(repo, provenance)}`);
  process.exit(0);
}

const local = args.includes('--local');
const problems = [];
const text = readFileSync(provenance, 'utf8');
const rows = [...text.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)].map(m => ({ local: m[1], source: m[2], sha: m[3] }));
if (!rows.length) problems.push('PROVENANCE.md has no rows');
const listed = new Set(rows.map(r => r.local));
let compared = 0;
for (const r of rows) {
  const file = join(tokens, r.local);
  if (!existsSync(file)) { problems.push(`missing: ${r.local}`); continue; }
  if (sha(file) !== r.sha) problems.push(`changed here: ${r.local}`);
  if (!local && existsSync(kit)) {
    const src = join(kit, r.source);
    if (!existsSync(src)) problems.push(`source gone: ${r.source}`);
    else if (sha(src) !== r.sha) problems.push(`source differs: ${r.source}`);
    else compared++;
  }
}
// A file in assets/ that PROVENANCE.md does not list is also a failure.
for (const [, to] of MOVES) {
  const dir = join(tokens, to);
  if (!existsSync(dir)) continue;
  for (const f of statSync(dir).isDirectory() ? walk(dir) : [dir]) {
    const rel = posix(relative(tokens, f));
    if (!listed.has(rel)) problems.push(`not in PROVENANCE.md: ${rel}`);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const where = local ? 'local only' : existsSync(kit) ? `${compared} sources matched` : 'design-kit not found, local only';
console.log(`assets ok: ${rows.length} files match PROVENANCE.md (${where})`);
