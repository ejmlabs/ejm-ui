#!/usr/bin/env node
// ejm-ssg build | dev | budget [dist] [--js N --css N --fonts N --html N --json]
import { main } from '../src/budget.mjs';

const [cmd = 'build', ...rest] = process.argv.slice(2);
if (cmd === 'budget') {
  process.exitCode = main(rest);
} else if (cmd === 'build' || cmd === 'dev') {
  // The prerender is the ejmSsg() Vite plugin, so the build is a plain Vite build of the project in the current directory.
  const vite = await import('vite');
  if (cmd === 'build') {
    process.env.NODE_ENV = 'production'; // a leaked NODE_ENV=test would bundle React's development build
    await vite.build();
  } else {
    const server = await vite.createServer();
    await server.listen();
    server.printUrls();
  }
} else {
  console.error('usage: ejm-ssg build | dev | budget [dist] [--js N] [--css N] [--fonts N] [--html N] [--ignore glob]... [--json]');
  process.exitCode = 2;
}
