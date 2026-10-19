export interface BudgetLimits {
  js: number;
  css: number;
  fonts: number;
  html: number;
}
export interface RouteSize {
  route: string;
  /** Bytes: gzip for html, js and css; raw for fonts. */
  bytes: BudgetLimits;
  files: { js: string[]; css: string[]; fonts: string[] };
}
export interface BudgetReport {
  rows: RouteSize[];
  breaches: string[];
  limits: BudgetLimits;
}
export const DEFAULT_BUDGET: BudgetLimits;
export function referencedFiles(dist: string, htmlFile: string, base?: string): { js: string[]; css: string[]; fonts: string[] };
export function globToRegExp(glob: string): RegExp;
export function isIgnored(ignore: string[], rel: string, route: string): boolean;
export function checkBudget(dist: string, budget?: Partial<BudgetLimits>, options?: { base?: string; ignore?: string[] }): BudgetReport;
export function formatReport(report: BudgetReport): string;
export function main(argv: string[], cwd?: string): number;
