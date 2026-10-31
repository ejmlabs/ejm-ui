export function checkUi(theme: any, resolved?: any): string[];
export function checkBoard(theme: any, resolved?: any): string[];
export function checkBands(theme: any, brand: Record<string, string>, resolved?: any): { problems: string[]; rows: { label: string; value: number; min: number }[] };
export function checkAll(theme: any, brand?: Record<string, string>): string[];
