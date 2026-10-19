#!/usr/bin/env node
// ejm-site-headers [file] [--check] [--no-analytics] [--list]
//   ejm-site-headers public/_headers           write the shared headers file
//   ejm-site-headers public/_headers --check   exit 1 when the file differs from what this version would write
//   ejm-site-headers --list                    print the policy to stdout
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { headersFile } from '../src/headers.mjs';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const file = args.find(a => !a.startsWith('--'));
const want = headersFile({ analytics: !flag('--no-analytics') });

if (flag('--list') || !file) {
  process.stdout.write(want);
} else if (flag('--check')) {
  const have = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (have !== want) {
    console.error(`ejm-site-headers: ${file} ${have === null ? 'is missing' : 'is out of date'}. Run: ejm-site-headers ${file}`);
    process.exitCode = 1;
  } else console.log(`ejm-site-headers: ${file} is current`);
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, want);
  console.log(`ejm-site-headers: wrote ${file}`);
}
