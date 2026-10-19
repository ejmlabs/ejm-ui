// @vitest-environment node
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cliGlyphs } from '../cli';
import { buildFrames } from './build-frames';
import { frames } from './frames';
import { glyphs } from './glyphs';

describe('frames', () => {
  it('match what the engines produce; run with UPDATE_FRAMES=1 after changing a scenario', () => {
    const built = buildFrames();
    if (process.env.UPDATE_FRAMES) for (const [name, frame] of Object.entries(built)) writeFileSync(new URL(`./frames/${name}.json`, import.meta.url), JSON.stringify(frame, null, 1) + '\n');
    else expect(frames).toEqual(built);
  });

  it('are deterministic', () => expect(buildFrames()).toEqual(buildFrames()));

  it('show the product as documented: the cli patch is blocked and the ide change is applied', () => {
    expect(frames.cli.write).toBe(false);
    expect(frames.cli.blocks.at(-1)?.lines[0]?.t).toMatch(/blocked/);
    expect(frames.ide.chat.some((c) => c.kind === 'tool' && c.word === 'applied')).toBe(true);
    expect(frames.harness.sessions.some((s) => s.word === 'recovering')).toBe(true);
  });

  it('use the same glyphs as the cli engine', () => {
    expect(glyphs.unicode).toEqual(cliGlyphs(false));
    expect(glyphs.ascii).toEqual(cliGlyphs(true));
  });
});
