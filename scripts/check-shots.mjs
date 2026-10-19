#!/usr/bin/env node
// Shot honesty check (tasks 15.4 to 15.6). Product imagery must be a real capture of the current product. Three checks:
//
//  1. Metadata. Every packages/shots/assets/<product>/<name>.json has a product, the command (or capture method), a product version
//     or git commit, a capture date, the theme or themes, how it was captured, the image size per theme (and it equals the PNG), and
//     for terminal shots the transcript. Each listed theme has its PNG and every PNG has a listed theme. Field names are mapped by
//     packages/shots/scripts/shot-meta.mjs. A missing field is an ERROR.
//  2. Stale. A shot is STALE when its product has newer commits touching its UI source since the recorded commit:
//        git -C <repo> log <recorded>..HEAD --oneline -- <paths>
//     is not empty. <paths> is per product (PRODUCTS below, or --config). With only a version recorded, stale means the version
//     differs from the product's current VERSION file or package.json version. Stale is a WARNING, and an ERROR with --strict.
//     Always an ERROR: the recorded commit is unknown to the repo or not an ancestor of HEAD, so the shot cannot be tied to the source.
//     A WARNING always: the shot was captured with uncommitted changes in the product tree (the commit then does not fully identify
//     what was captured), or the product repo is not on disk (the shot cannot be compared; an ERROR with --strict).
//  3. Simulated windows. No page or component may present a drawn window as product imagery. In packages/ui/src,
//     packages/demos/src/hero, apps/gallery and examples, every <ProductStage> and every <ProductWindow> without `live` is a
//     FINDING (a drawn, labelled "Simulated screen" window; only the live demo islands may draw a window). A finding is an ERROR.
//     A documentation page that shows the component itself marks the usage with a comment `ejm-shots-allow: <reason>` on one of the
//     three lines above it. A drawn window inside <Illustration>...</Illustration> is allowed: that component always shows the label
//     "Illustration of <product>, not a screenshot".
//  4. Illustrations (metadata kind "illustration", allowed only where a real capture is impossible). An illustration is an ERROR when
//     its metadata records a command, capture method, version, commit, binary or transcript (it would read as a real capture), when
//     its title or caption calls it a screenshot or a capture, when a source file shows it through getShot() without ProductShot or
//     Illustration (so without the label), or when the label source is gone from Illustration.tsx or ProductShot.tsx.
//
// Usage: node scripts/check-shots.mjs [--strict] [--no-windows] [--config file.json] [--repos dir] [--assets dir]
//   --config   JSON { "products": { "cli": { "repo": "../ejm-cli", "paths": ["crates/ejm-cli/src"], "versionFile": "VERSION" } } }, merged over PRODUCTS
//   --repos    the folder holding ejm-cli, ejm-harness and ejm-ide (default: the folder above this repo)
// Exit 1 on any error or finding.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMeta, readShotMeta } from '../packages/shots/scripts/shot-meta.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The product UI source, as git pathspecs inside each repo. Change a list when a product moves its terminal or window code. */
export const PRODUCTS = {
  cli: { repo: 'ejm-cli', paths: ['crates/ejm-cli/src'], versionFile: 'VERSION' },
  harness: { repo: 'ejm-harness', paths: ['crates/ejm-harness/src', 'crates/ejm-harness-worker/src', 'sdk', 'examples'], versionFile: 'VERSION' },
  ide: { repo: 'ejm-ide', paths: ['src', 'app', 'src-tauri/src'], versionFile: 'package.json' },
};

export const WINDOW_SCAN = ['packages/ui/src', 'packages/demos/src/hero', 'apps/gallery/src', 'examples'];
/** Where a getShot() of an illustration must sit beside ProductShot or Illustration. */
export const SHOT_USE_SCAN = ['apps', 'examples', 'packages/ui/src', 'packages/demos/src', 'packages/site'];

const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitOk = (repo, args) => { try { git(repo, args); return true; } catch { return false; } };
const walk = d => (existsSync(d) ? readdirSync(d).flatMap(n => (['node_modules', 'dist', 'build', '.react-router'].includes(n) ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])) : []);

function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function currentVersion(repoDir, versionFile) {
  const f = join(repoDir, versionFile);
  if (!existsSync(f)) return undefined;
  const text = readFileSync(f, 'utf8');
  return versionFile.endsWith('.json') ? JSON.parse(text).version : text.trim();
}

/** Finds the capture metadata files and checks them. */
function checkMetadata({ assets, repos, products, strict, errors, warnings, summary }) {
  const ids = existsSync(assets) ? readdirSync(assets).filter(d => statSync(join(assets, d)).isDirectory()) : [];
  for (const id of ids) {
    const files = readdirSync(join(assets, id));
    const names = new Set([...files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)), ...files.filter(f => /\.(dark|light)\.png$/.test(f)).map(f => f.replace(/\.(dark|light)\.png$/, ''))]);
    for (const name of [...names].sort()) {
      const label = `${id}/${name}`;
      const read = readShotMeta(assets, id, name);
      if (read.missing) { errors.push(`${label}: images without a metadata file (${id}/${name}.json)`); continue; }
      if (read.invalid) { errors.push(`${label}: metadata is not valid JSON (${read.invalid})`); continue; }
      const { meta, problems, sizes, workingTreeChanges } = normalizeMeta(read.raw, id);
      for (const p of problems) errors.push(`${label}: ${p}`);
      summary.shots++;
      for (const theme of ['dark', 'light']) {
        const png = join(assets, id, `${name}.${theme}.png`);
        const listed = meta.themes.includes(theme);
        if (listed && !existsSync(png)) errors.push(`${label}: theme ${theme} is listed but ${name}.${theme}.png is missing`);
        if (!listed && existsSync(png)) errors.push(`${label}: ${name}.${theme}.png has no ${theme} entry in the metadata`);
        if (listed && existsSync(png) && sizes[theme]) {
          const have = pngSize(png);
          if (!have) errors.push(`${label}: ${name}.${theme}.png is not a PNG`);
          else if (have.width !== sizes[theme].width || have.height !== sizes[theme].height) errors.push(`${label}: ${theme} size in the metadata is ${sizes[theme].width}x${sizes[theme].height} but the PNG is ${have.width}x${have.height}`);
        }
      }

      if (meta.kind === 'illustration') {
        summary.illustrations.add(label);
        const said = `${meta.title} ${meta.caption ?? ''}`.replace(/not a screenshot/gi, '');
        if (/\b(screenshots?|captured?|captures?|real)\b/i.test(said)) errors.push(`${label}: an illustration's title or caption calls it a screenshot or a capture: "${said.trim()}"`);
        continue; // an illustration is not tied to the product source
      }

      // Stale: compare with the product source.
      const spec = products[id];
      if (!spec) { warnings.push(`${label}: no product repo configured for "${id}", so it cannot be compared with the source`); continue; }
      const repoDir = resolve(repos, spec.repo);
      const note = (msg, hard) => (hard || strict ? errors : warnings).push(`${label}: ${msg}`);
      if (!existsSync(join(repoDir, '.git'))) { note(`product repo ${spec.repo} is not on disk (looked in ${repoDir}), so it cannot be compared with the source`, false); continue; }
      if (meta.commit) {
        if (!gitOk(repoDir, ['cat-file', '-e', `${meta.commit}^{commit}`])) { note(`recorded commit ${meta.commit.slice(0, 12)} is not in ${spec.repo}`, true); continue; }
        if (!gitOk(repoDir, ['merge-base', '--is-ancestor', meta.commit, 'HEAD'])) { note(`recorded commit ${meta.commit.slice(0, 12)} is not an ancestor of ${spec.repo} HEAD`, true); continue; }
        const newer = git(repoDir, ['log', `${meta.commit}..HEAD`, '--oneline', '--', ...spec.paths]).split('\n').filter(Boolean);
        if (newer.length) note(`STALE: ${spec.repo} has ${newer.length} newer commit(s) touching ${spec.paths.join(', ')} since ${meta.commit.slice(0, 12)}: ${newer.slice(0, 3).join('; ')}${newer.length > 3 ? '; ...' : ''}`, false);
      } else if (meta.version) {
        const now = currentVersion(repoDir, spec.versionFile);
        if (!now) note(`recorded version ${meta.version} cannot be compared: no ${spec.versionFile} in ${spec.repo}`, false);
        else if (now !== meta.version) note(`STALE: recorded version ${meta.version}, ${spec.repo} is now ${now}`, false);
      }
      if (workingTreeChanges > 0) warnings.push(`${label}: captured with ${workingTreeChanges} uncommitted change(s) in ${spec.repo}, so the commit does not fully identify what was captured`);
    }
  }
}

/** Reads the attribute names of a JSX opening tag that starts at `start` (the `<`). Returns { names, end, hasLiveFalse }. */
function openingTag(text, start) {
  let i = start + 1;
  while (/[\w.]/.test(text[i])) i++;
  const names = new Set();
  let live = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '>' ) break;
    if (c === '/' && text[i + 1] === '>') { i++; break; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '{') { // spread
      i = skipBraces(text, i);
      continue;
    }
    const m = /^[\w:-]+/.exec(text.slice(i));
    if (!m) { i++; continue; }
    const name = m[0];
    names.add(name);
    i += name.length;
    if (text[i] === '=') {
      i++;
      const v = text[i];
      let valueStart = i;
      if (v === '{') i = skipBraces(text, i);
      else if (v === '"' || v === "'") i = text.indexOf(v, i + 1) + 1;
      if (name === 'live') live = !/^\{\s*false\s*\}$/.test(text.slice(valueStart, i));
    } else if (name === 'live') live = true;
  }
  return { names, end: i, live };
}
function skipBraces(text, i) {
  let depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (i++; i < text.length && text[i] !== q; i++) if (text[i] === '\\') i++; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  return i;
}

/** Findings for one source text: [{ line, tag, reason }]. */
export function findSimulatedWindows(text) {
  const out = [];
  const lines = text.split('\n');
  // Windows inside <Illustration>...</Illustration> are labelled by that component.
  const labelled = [...text.matchAll(/<Illustration(?![\w.])[\s\S]*?<\/Illustration>/g)].map(m => [m.index, m.index + m[0].length]);
  for (const m of text.matchAll(/<(ProductStage|ProductWindow)(?![\w.])/g)) {
    if (labelled.some(([a, b]) => m.index > a && m.index < b)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    const near = lines.slice(Math.max(0, line - 4), line).join('\n');
    if (/ejm-shots-allow:[ \t]*\S/.test(near)) continue;
    if (m[1] === 'ProductStage') out.push({ line, tag: 'ProductStage', reason: 'a stage of drawn windows' });
    else if (!openingTag(text, m.index).live) out.push({ line, tag: 'ProductWindow', reason: 'a drawn window without `live` (it shows "Simulated screen")' });
  }
  return out;
}

function scanWindows({ base, dirs, findings }) {
  for (const dir of dirs) {
    for (const file of walk(join(base, dir))) {
      const rel = relative(base, file).split('\\').join('/');
      if (!/\.(tsx|jsx|mdx)$/.test(file) || /\.test\.|test-setup/.test(file) || rel === 'packages/ui/src/layout/ProductWindow.tsx') continue;
      for (const f of findSimulatedWindows(readFileSync(file, 'utf8'))) findings.push(`${rel}:${f.line}: <${f.tag}> is ${f.reason}; replace it with a ProductShot`);
    }
  }
}

/** A getShot() of an illustration outside ProductShot or Illustration would show it with no label. */
function scanIllustrationUse({ base, dirs, illustrations, findings }) {
  if (!illustrations.size) return;
  for (const dir of dirs) {
    for (const file of walk(join(base, dir))) {
      if (!/\.(tsx|jsx|ts|mdx)$/.test(file) || /\.test\./.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (/<(ProductShot|Illustration)(?![\w.])/.test(text)) continue;
      for (const m of text.matchAll(/getShot\(\s*['"]([\w-]+)['"]\s*,\s*['"]([\w-]+)['"]/g)) {
        if (illustrations.has(`${m[1]}/${m[2]}`)) findings.push(`${relative(base, file).split('\\').join('/')}:${text.slice(0, m.index).split('\n').length}: ${m[1]}/${m[2]} is an illustration but is not shown with ProductShot or Illustration, so it has no label`);
      }
    }
  }
}

/** The label must stay in the components that show an illustration. */
function checkLabelSource({ base, errors }) {
  const need = [['packages/ui/src/layout/Illustration.tsx', 'not a screenshot'], ['packages/ui/src/layout/ProductShot.tsx', 'IllustrationLabel']];
  for (const [f, word] of need) {
    const file = join(base, f);
    if (existsSync(file) && !readFileSync(file, 'utf8').includes(word)) errors.push(`${f}: no longer contains "${word}", so illustrations would lose their label`);
  }
}

export function checkShots({ base = root, assets = join(base, 'packages/shots/assets'), repos = resolve(base, '..'), config, strict = false, windows = true, windowDirs = WINDOW_SCAN, useDirs = SHOT_USE_SCAN } = {}) {
  const products = Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, { ...v, ...(config?.products?.[k] ?? {}) }]));
  for (const [k, v] of Object.entries(config?.products ?? {})) products[k] ??= v;
  const errors = [];
  const warnings = [];
  const findings = [];
  const summary = { shots: 0, illustrations: new Set() };
  checkMetadata({ assets, repos, products, strict, errors, warnings, summary });
  checkLabelSource({ base, errors });
  if (windows) {
    scanWindows({ base, dirs: windowDirs, findings });
    scanIllustrationUse({ base, dirs: useDirs, illustrations: summary.illustrations, findings });
  }
  return { errors, warnings, findings, summary: { shots: summary.shots, illustrations: summary.illustrations.size } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = n => { const i = process.argv.indexOf(n); return i === -1 ? undefined : process.argv[i + 1]; };
  const configFile = arg('--config');
  const result = checkShots({
    strict: process.argv.includes('--strict'),
    windows: !process.argv.includes('--no-windows'),
    ...(arg('--repos') ? { repos: resolve(arg('--repos')) } : {}),
    ...(arg('--assets') ? { assets: resolve(arg('--assets')) } : {}),
    ...(configFile ? { config: JSON.parse(readFileSync(configFile, 'utf8')) } : {}),
  });
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  for (const e of result.errors) console.error(`error: ${e}`);
  if (result.findings.length) console.error(`simulated windows used as product imagery (${result.findings.length}):\n  ${result.findings.join('\n  ')}`);
  const bad = result.errors.length + result.findings.length;
  console.log(`check-shots: ${result.summary.shots} shot(s) (${result.summary.illustrations} illustration(s)), ${result.warnings.length} warning(s), ${result.errors.length} error(s), ${result.findings.length} finding(s)`);
  process.exit(bad ? 1 : 0);
}
