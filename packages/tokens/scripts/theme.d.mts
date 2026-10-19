export const tokensRoot: string;
export function ratio(a: string, b: string): number;
export function mix(a: string, b: string, t: number): string;
export function loadTheme(): { theme: any; brand: Record<string, string> };
export function resolveThemes(theme: any): any;
export function resolveBands(theme: any, brand: Record<string, string>, resolved?: any): any;
