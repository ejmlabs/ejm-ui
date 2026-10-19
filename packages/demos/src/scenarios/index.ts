/**
 * The bundled scenario data. TypeScript infers wide literal types from the JSON, so each file is
 * cast to its scenario type here. `scenarios.test.ts` validates every file against those types,
 * so the casts are checked at test time.
 */
import cliJson from './cli.json';
import harborJson from './harbor.json';
import harnessJson from './harness.json';
import ideJson from './ide.json';
import labelsJson from './labels.json';
import type { CliScenario, HarnessScenario, IdeScenario, Labels, Project } from '../types';

export const cliScenario = cliJson as unknown as CliScenario;
export const ideScenario = ideJson as unknown as IdeScenario;
export const harnessScenario = harnessJson as unknown as HarnessScenario;
/** The sample "harbor" repository the cli and ide scenarios read and edit. */
export const project = harborJson as unknown as Project;
export const labels = labelsJson as unknown as Labels;
export const cliLabels = labels.cli;
export const ideLabels = labels.ide;
