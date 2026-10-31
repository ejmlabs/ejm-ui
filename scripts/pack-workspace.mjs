import { execFileSync } from 'node:child_process';

export function packWorkspace(name, destination, repo) {
  const stdout = execFileSync('npm', ['pack', '-w', `packages/${name}`, '--pack-destination', destination, '--json'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const out = JSON.parse(stdout);
  // npm 11 prints an array, npm 12 an object keyed by package name; `-w <one package>` yields one entry either way.
  const [info] = Array.isArray(out) ? out : Object.values(out);
  console.log(`${info.name.padEnd(14)} ${String(info.size).padStart(9)} bytes gzip, ${String(info.unpackedSize).padStart(9)} unpacked, ${String(info.entryCount).padStart(4)} files`);
  return info;
}
