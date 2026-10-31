# pack-proofs Specification

## Purpose

Keep the tarball proofs usable on every supported npm major, so a proof result reflects the packages under test and not the output format of the npm that ran it.

## Requirements

### Requirement: Proofs accept either npm pack JSON shape

`node scripts/pack-proof.mjs` and `node scripts/pack-proof-publish.mjs` SHALL read the result of `npm pack -w <package> --json` whether npm prints an array holding one entry (npm 11) or an object keyed by package name (npm 12). Each proof SHALL take its packed name, filename, sizes and file list from that one entry and SHALL otherwise behave the same under both shapes.

#### Scenario: npm 12 object output
- **WHEN** a proof runs under npm 12, where `npm pack -w packages/core --json` prints `{ "@ejm/core": { "name": "@ejm/core", ... } }`
- **THEN** the proof reads the entry for that package, prints its size line and continues to the consumer install.

#### Scenario: npm 11 array output
- **WHEN** a proof runs under npm 11, where `npm pack -w packages/core --json` prints `[ { "name": "@ejm/core", ... } ]`
- **THEN** the proof reads the single array entry and behaves exactly as it does under npm 12.
