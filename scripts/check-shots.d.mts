export interface ShotProductConfig { repo: string; paths: string[]; versionFile: string }
export const PRODUCTS: Record<string, ShotProductConfig>;
export const WINDOW_SCAN: string[];
export const SHOT_USE_SCAN: string[];
export interface CheckShotsOptions {
  base?: string;
  assets?: string;
  repos?: string;
  config?: { products?: Record<string, Partial<ShotProductConfig>> };
  strict?: boolean;
  windows?: boolean;
  windowDirs?: string[];
  useDirs?: string[];
}
export interface CheckShotsResult { errors: string[]; warnings: string[]; findings: string[]; summary: { shots: number; illustrations: number } }
export function checkShots(options?: CheckShotsOptions): CheckShotsResult;
export function findSimulatedWindows(text: string): { line: number; tag: 'ProductStage' | 'ProductWindow'; reason: string }[];
