// @vitest-environment node
// The fixture images are generated here, in a temp folder, and are test inputs only: they are never product imagery.
import { ProductShot } from '@ejm/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { optimizeShots, plan } from '../scripts/optimize.mjs';
import { createShots, shotCaption, type ShotsIndex } from './loader';

const root = mkdtempSync(join(tmpdir(), 'ejm-shots-test-'));
const assets = join(root, 'assets');
const out = join(root, 'generated');
afterAll(() => rmSync(root, { recursive: true, force: true }));

// The shape the capture tool writes (packages/shots/src/capture.mjs): its own field names, a transcript and pixel size per theme.
const result = { pixelWidth: 32, pixelHeight: 18, transcript: 'a very long transcript\n'.repeat(500) };
const meta = {
  product: 'cli', name: 'read', command: 'ejm-cli --replay run "Hello"', themes: ['dark', 'light'], productVersion: 'ejm-cli 0.3.1', gitCommit: 'abcdef0123456',
  captureDate: '2026-10-18T09:00:00.000Z', how: 'Fixture.', results: { dark: result, light: result },
};

async function png(file: string, hue: string) {
  const rows = Array.from({ length: 3 }, (_, i) => `<rect x="2" y="${3 + i * 4}" width="${6 + i * 8}" height="2" fill="${i % 2 ? '#8a9a7b' : hue}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18"><rect width="32" height="18" fill="#131614"/>${rows}</svg>`;
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, await sharp(Buffer.from(svg)).png().toBuffer());
}

// Encode once; read-only assertions use only this completed baseline.
let optimized: Awaited<ReturnType<typeof optimizeShots>>;
beforeAll(async () => {
  await png(join(assets, 'cli', 'read.dark.png'), '#e3e5dc');
  await png(join(assets, 'cli', 'read.light.png'), '#202721');
  writeFileSync(join(assets, 'cli', 'read.json'), JSON.stringify(meta));
  optimized = await optimizeShots({ assets, out });
}, 30_000);

function copyFixture() {
  const isolated = mkdtempSync(join(root, 'isolated-'));
  const copy = { root: isolated, assets: join(isolated, 'assets'), out: join(isolated, 'generated') };
  cpSync(assets, copy.assets, { recursive: true });
  cpSync(out, copy.out, { recursive: true });
  return copy;
}

describe('optimize', () => {
  it('plans the 1x width from the CSS size and the 2x width from the PNG, never upscaling', () => {
    expect(plan(960, 2)).toMatchObject({ base: 480, widths: [480, 960] });
    expect(plan(960, 1)).toMatchObject({ widths: [960] });
  });

  it('writes AVIF, WebP and PNG at both widths with sizes and hashes, and keeps the transcript out of the index', async () => {
    const { index, problems } = optimized;
    expect(problems).toEqual([]);
    const dark = index.shots['cli/read'].themes.dark;
    expect(dark).toMatchObject({ width: 16, height: 9, widths: [16, 32] });
    expect(dark.files.map((f: { file: string }) => f.file).sort()).toEqual(
      ['avif', 'png', 'webp'].flatMap(ext => [16, 32].map(w => `cli/read.dark.${w}w.${ext}`)).sort(),
    );
    for (const f of dark.files) {
      expect(readFileSync(join(out, f.file)).length).toBe(f.bytes);
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    const avif = await sharp(join(out, 'cli/read.dark.32w.avif')).metadata();
    expect([avif.format, avif.width, avif.height]).toEqual(['heif', 32, 18]);
    expect(JSON.stringify(index)).not.toContain('transcript');
    expect(index.shots['cli/read'].meta).toMatchObject({ product: 'ejm-cli', kind: 'screenshot', surface: 'terminal', version: '0.3.1', commit: 'abcdef0123456', date: '2026-10-18', scale: 2 });
    expect(JSON.parse(readFileSync(join(out, 'shots.json'), 'utf8'))).toEqual(index);
    expect(JSON.parse(readFileSync(join(out, 'cli.json'), 'utf8'))).toEqual(index);
  });

  it('--check passes when current and fails when a source, an output or the metadata changes', async () => {
    const { root: isolated, assets, out } = copyFixture();
    try {
      expect((await optimizeShots({ assets, out, check: true })).problems).toEqual([]);

      await png(join(assets, 'cli', 'read.light.png'), '#ff0000');
      expect((await optimizeShots({ assets, out, check: true })).problems.join()).toMatch(/cli\/read light: source or outputs changed/);
      await optimizeShots({ assets, out });
      expect((await optimizeShots({ assets, out, check: true })).problems).toEqual([]);

      writeFileSync(join(out, 'cli/read.dark.16w.webp'), 'tampered');
      expect((await optimizeShots({ assets, out, check: true })).problems.join()).toMatch(/cli\/read dark/);
      await optimizeShots({ assets, out });

      writeFileSync(join(assets, 'cli', 'read.json'), JSON.stringify({ ...meta, productVersion: 'ejm-cli 0.4.0' }));
      expect((await optimizeShots({ assets, out, check: true })).problems.join()).toMatch(/shots.json does not match/);
      await optimizeShots({ assets, out });

      writeFileSync(join(out, 'cli/stray.png'), 'x');
      expect((await optimizeShots({ assets, out, check: true })).problems.join()).toMatch(/stray.png: output file with no source/);
      await optimizeShots({ assets, out });
      expect((await optimizeShots({ assets, out, check: true })).problems).toEqual([]);
    } finally {
      rmSync(isolated, { recursive: true, force: true });
    }
  }, 30_000);

  it('fails a shot whose largest AVIF is over the budget, and a shot with no metadata file', async () => {
    const { root: isolated, assets, out } = copyFixture();
    try {
      expect((await optimizeShots({ assets, out, check: true, budgetKb: 0.001 })).problems.join()).toMatch(/over the 0.001 KB budget/);
      await png(join(assets, 'cli', 'nometa.dark.png'), '#fff');
      expect((await optimizeShots({ assets, out, check: true })).problems.join()).toMatch(/nometa.dark.png: no metadata file/);
    } finally {
      rmSync(isolated, { recursive: true, force: true });
    }
  });
});

describe('createShots and ProductShot', () => {
  it('builds srcsets from the index and URLs, and ProductShot renders them', () => {
    const { index } = optimized;
    const { getShot, listShots } = createShots(index as unknown as ShotsIndex, f => `/dist/${f}`);
    expect(listShots()).toEqual(['cli/read']);
    const shot = getShot('cli', 'read');
    expect(shot).toMatchObject({ kind: 'screenshot', surface: 'terminal', title: 'ejm-cli', caption: 'ejm-cli 0.3.1 (abcdef0), captured 2026-10-18.' });
    expect(shot.variants.dark).toMatchObject({
      width: 16,
      height: 9,
      avif: '/dist/cli/read.dark.16w.avif 16w, /dist/cli/read.dark.32w.avif 32w',
      src: '/dist/cli/read.dark.16w.png',
      order: expect.arrayContaining(['avif', 'webp']),
    });
    expect(() => getShot('cli', 'nope')).toThrow(/Known shots: cli\/read/);

    const html = renderToStaticMarkup(createElement(ProductShot, { shot, alt: 'A fixture', frame: true, priority: true }));
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('width="16" height="9"');
    expect(html).toContain('captured 2026-10-18.');
  });
});

describe('shotCaption', () => {
  it('names the product, the version or commit, and the date', () => {
    expect(shotCaption({ product: 'ejm-ide', version: '1.2.0', date: '2026-10-18' })).toBe('ejm-ide 1.2.0, captured 2026-10-18.');
    expect(shotCaption({ product: 'ejm-harness', commit: 'abcdef0123456', date: '2026-10-18' })).toBe('ejm-harness commit abcdef0, captured 2026-10-18.');
    expect(shotCaption({ product: 'ejm-ide', kind: 'illustration', version: '1.2.0', date: '2026-10-18', caption: 'A chat with a diff' })).toBe('A chat with a diff');
    expect(shotCaption({ product: 'ejm-cli', version: '0.3.1', commit: 'abcdef0123456', date: '2026-10-18', caption: 'A read, then a blocked write' })).toBe(
      'A read, then a blocked write. ejm-cli 0.3.1 (abcdef0), captured 2026-10-18.',
    );
  });
});
