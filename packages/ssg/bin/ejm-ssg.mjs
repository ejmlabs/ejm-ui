#!/usr/bin/env node
// ejm-ssg build | dev

const [cmd = 'build'] = process.argv.slice(2);
if (cmd === 'build' || cmd === 'dev') {
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
  console.error('usage: ejm-ssg build | dev');
  process.exitCode = 2;
}
