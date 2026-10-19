export const PIPELINE: string;
export const THEMES: string[];
export interface OptimizeOptions { assets?: string; out?: string; check?: boolean; budgetKb?: number }
export function plan(pngWidth: number, scale?: number): { base: number; widths: number[] };
export function optimizeShots(options?: OptimizeOptions): Promise<{ index: { format: 1; pipeline: string; shots: Record<string, any> }; problems: string[]; report: string[] }>;
