export function displayName(id: string): string;
export function normalizeMeta(raw: Record<string, any>, id: string): {
  meta: Record<string, any>;
  problems: string[];
  transcripts: Record<string, string>;
  sizes: Record<string, { width: number; height: number }>;
  workingTreeChanges: number | undefined;
};
export function readShotMeta(dir: string, id: string, name: string): { raw?: Record<string, any>; missing?: true; invalid?: string; file: string };
