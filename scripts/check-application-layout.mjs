#!/usr/bin/env node
// Check the built application-page gallery fixture in Chrome. Reuse the existing capture engine and static server.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { findChrome, serve } from './perf.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const args = process.argv.slice(2);
let dist = join(repo, 'apps/gallery/dist');
let out = join(tmpdir(), 'ejm-application-layout');
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--out' || args[i] === '--dist') && args[i + 1]) {
    const option = args[i], value = resolve(args[++i]);
    if (option === '--out') out = value;
    else dist = value;
  } else {
    console.error('Usage: node scripts/check-application-layout.mjs [--dist dir] [--out dir]');
    process.exit(2);
  }
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome not found. Install Google Chrome or set CHROME to a Chrome or Chromium binary.');
  if (!existsSync(join(dist, 'application-layout/index.html'))) throw new Error('The application-layout fixture is missing. Run npm run build -w @ejm/gallery first.');
  mkdirSync(out, { recursive: true });
  const started = Date.now();
  writeFileSync(join(out, 'summary.json'), JSON.stringify({ startedAt: new Date(started).toISOString(), passed: false }, null, 2) + '\n');
  const server = await serve(dist);
  const reports = [];
  try {
    for (const theme of ['light', 'dark']) {
      const reportPath = join(out, `${theme}-metrics.json`);
      const result = await run(process.execPath, [join(repo, 'scripts/shoot.mjs'), `${server.url}/application-layout/`,
        '--only', 'android-small,application-desktop', '--theme', theme, '--layout', 'application', '--full', '--out', out, '--report', reportPath], {
        cwd: repo,
        env: { ...process.env, CHROME: chrome, EJM_SHOOT_EXTRA: 'application-desktop:1280x900@1' },
        timeout: 120_000,
        maxBuffer: 1_048_576,
      }).catch(error => {
        if (error.stdout) process.stdout.write(error.stdout);
        if (error.stderr) process.stderr.write(error.stderr);
        throw new Error(`${theme} application layout check failed: ${error.message}`);
      });
      process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      if (!existsSync(reportPath) || statSync(reportPath).mtimeMs < started - 1000) throw new Error(`${theme}: fresh measurement evidence is missing`);
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      if (report.url !== `${server.url}/application-layout/?theme=${theme}` || report.theme !== theme || report.layout !== 'application' || report.failed !== 0 || report.rows?.length !== 2) throw new Error(`${theme}: incomplete, stale or failed measurement report`);
      for (const row of report.rows) {
        if (row.error || row.result?.overflow || row.result?.smallCount || row.layout?.metrics.theme !== theme || row.layout?.breaches.length !== 0) throw new Error(`${theme}: viewport ${row.m?.name} has missing or failed measurements`);
        if (![360, 1280].includes(row.m?.w) || row.result.innerWidth !== row.m.w || !row.files?.length || row.cut) throw new Error(`${theme}: viewport or full-page capture evidence is incomplete`);
        for (const file of row.files) {
          if (!existsSync(file) || statSync(file).mtimeMs < started - 1000 || !readFileSync(file).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${theme}: fresh PNG evidence is missing: ${file}`);
        }
      }
      if (new Set(report.rows.map(row => row.m.w)).size !== 2) throw new Error(`${theme}: both viewport widths were not measured`);
      reports.push({ theme, reportPath, screenshots: report.rows.flatMap(row => row.files) });
    }
    const summary = join(out, 'summary.json');
    writeFileSync(summary, JSON.stringify({ startedAt: new Date(started).toISOString(), durationMs: Date.now() - started, widths: [360, 1280], reports, passed: true }, null, 2) + '\n');
    console.log(`\nApplication layout: four browser passes succeeded. Evidence: ${summary}`);
  } finally {
    await server.close();
  }
}

main().catch(error => { console.error(`application layout: ${error.message}`); process.exitCode = 1; });
