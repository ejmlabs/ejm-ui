// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';
import { designGuardPlugin } from './design-guard.mjs';
import { ejmUi } from './vite.mjs';

const roots = [];
async function appRoot(source) {
  const root = await mkdtemp(join(tmpdir(), 'ejm-ui-vite-'));
  roots.push(root);
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src/main.tsx'), source);
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('ejmUi', () => {
  it('adds Tailwind, React, one React copy and the design guard', async () => {
    const root = await appRoot('export default () => <h1>Hi</h1>;');
    const config = await resolveConfig({ root, configFile: false, logLevel: 'silent', plugins: [ejmUi()] }, 'build');
    const names = config.plugins.map(p => p.name);
    expect(names).toEqual(expect.arrayContaining(['@tailwindcss/vite:scan', 'vite:react-babel', 'ejm-ui:react', 'ejm-ui:design']));
  });

  it('keeps the dedupe the app already lists', async () => {
    const root = await appRoot('export default () => <h1>Hi</h1>;');
    const config = await resolveConfig({ root, configFile: false, logLevel: 'silent', resolve: { dedupe: ['zustand'] }, plugins: [ejmUi()] }, 'build');
    expect(config.resolve.dedupe).toEqual(expect.arrayContaining(['zustand', 'react', 'react-dom']));
  });
});

describe('design guard plugin', () => {
  const bad = 'export default () => <h1 className="local">Hello</h1>;';

  it('fails the build start on a consumer override', async () => {
    const root = await appRoot(bad);
    const guard = designGuardPlugin();
    guard.configResolved({ root });
    expect(() => guard.buildStart.call({ addWatchFile() {} })).toThrow(/src\/main\.tsx:1:\d+ Consumer className/);
  });

  it('checks once when two instances share a config', async () => {
    const root = await appRoot(bad);
    const config = { root };
    const [first, second] = [designGuardPlugin(), designGuardPlugin()];
    first.configResolved(config);
    second.configResolved(config);
    expect(() => second.buildStart.call({ addWatchFile() {} })).not.toThrow();
    expect(() => first.buildStart.call({ addWatchFile() {} })).toThrow(/Consumer className/);
  });

  it('checks each config on its own', async () => {
    const root = await appRoot(bad);
    for (const config of [{ root }, { root }]) {
      const guard = designGuardPlugin();
      guard.configResolved(config);
      expect(() => guard.buildStart.call({ addWatchFile() {} })).toThrow(/Consumer className/);
    }
  });
});
