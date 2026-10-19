export interface ParityResult {
  failures: string[];
  pending: string[];
  ok: string[];
  warnings: string[];
}
export function checkParity(opts?: { root?: string; strict?: boolean }): ParityResult;
