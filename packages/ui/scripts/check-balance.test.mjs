import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-balance.mjs');
const dir = mkdtempSync(join(tmpdir(), 'ejm-balance-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// A tiny PNG writer so the test needs no image tools: 8-bit RGB, no filter. `rows` is a list of [count of rows, [r, g, b]].
function png(name, rows, w = 40) {
  const raw = [];
  for (const [n, c] of rows) for (let y = 0; y < n; y++) { raw.push(0); for (let x = 0; x < w; x++) raw.push(...c); }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(raw.length / (w * 3 + 1), 4); ihdr[8] = 8; ihdr[9] = 2;
  const file = join(dir, name);
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(raw))), chunk('IEND', Buffer.alloc(0))]));
  return file;
}
const run = (file, ...extra) => spawnSync('node', [script, file, '--json', ...extra], { encoding: 'utf8' });

const hasPillow = spawnSync('python3', ['-I', '-c', 'import PIL']).status === 0 || spawnSync('uv', ['--version']).status === 0;

describe.skipIf(!hasPillow)('check-balance', () => {
  const SAGE = [0x8a, 0x9a, 0x7b], PAPER = [0xf6, 0xf5, 0xef], FOREST = [0x29, 0x44, 0x3b];

  it('reports the shares and passes when Forest stays under the limit', () => {
    const r = run(png('ok.png', [[30, SAGE], [60, PAPER], [10, FOREST]]));
    const out = JSON.parse(r.stdout);
    expect(r.status).toBe(0);
    expect(out.shares.sage).toBeCloseTo(30, 0);
    expect(out.shares.paperMist).toBeCloseTo(60, 0);
    expect(out.shares.forest).toBeCloseTo(10, 0);
  });

  it('fails when Forest sets a large ground', () => {
    const r = run(png('forest.png', [[40, FOREST], [60, PAPER]]));
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout).forestOver).toBe(true);
  });

  it('counts a color near a brand color and leaves a far one as other', () => {
    const near = JSON.parse(run(png('near.png', [[100, [0x8c, 0x9b, 0x7c]]])).stdout);
    expect(near.shares.sage).toBeCloseTo(100, 0);
    const far = JSON.parse(run(png('far.png', [[100, [255, 0, 0]]])).stdout);
    expect(far.shares.other).toBeCloseTo(100, 0);
  });
});
