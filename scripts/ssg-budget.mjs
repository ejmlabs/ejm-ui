#!/usr/bin/env node
// Budget gate for a prerendered site: node scripts/ssg-budget.mjs [dist] [--js 75 --css 14 --fonts 70 --html 30] [--json]
// Same as `ejm-ssg budget`; see packages/ssg/README.md.
import { main } from '../packages/ssg/src/budget.mjs';

process.exitCode = main(process.argv.slice(2));
