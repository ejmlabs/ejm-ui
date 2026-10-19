import { componentStates } from "./components";

/** The catalog this package publishes: component name to the states it renders. Written to catalog.json by catalog.test.ts. */
export function buildCatalog(): Record<string, string[]> {
  return Object.fromEntries(Object.entries(componentStates).map(([name, states]) => [name, [...states]]));
}
