import { createMachine, type Machine } from "./machine";

export type CopyState = "idle" | "copied" | "failed";
export type CopyAction = "copied" | "failed" | "reset";

export const copyReducer = (_s: CopyState, a: CopyAction): CopyState => (a === "reset" ? "idle" : a);

/** The visible label. The state is always named in words, so it reads without color. */
export const copyLabel = (s: CopyState): string => ({ idle: "Copy", copied: "Copied", failed: "Copy failed" })[s];

/** Text for a live region, empty while idle. */
export const copyAnnouncement = (s: CopyState): string => ({ idle: "", copied: "Copied to clipboard", failed: "Could not copy" })[s];

export interface CopyOptions {
  write(text: string): Promise<void> | void;
  /** How long the confirmation stays before returning to idle. */
  resetMs?: number;
  schedule?(fn: () => void, ms: number): unknown;
  cancel?(handle: unknown): void;
}

/** Copy with confirmation: write, show copied (or failed) for resetMs, then return to idle. A new copy restarts the timer. */
export function createCopy(opts: CopyOptions): { machine: Machine<CopyState, CopyAction>; copy(text: string): Promise<void> } {
  const machine = createMachine(copyReducer, "idle" as CopyState);
  const schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = opts.cancel ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let timer: unknown;
  return {
    machine,
    async copy(text) {
      cancel(timer);
      try {
        await opts.write(text);
        machine.send("copied");
      } catch {
        machine.send("failed");
      }
      timer = schedule(() => machine.send("reset"), opts.resetMs ?? 2000);
    },
  };
}
