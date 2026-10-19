import { copyAnnouncement, copyLabel, createCopy, type CopyState } from '@ejm/core';
import { useEffect, useState, useSyncExternalStore } from 'react';

export interface Clipboard {
  state: CopyState;
  /** "Copy", "Copied" or "Copy failed". The state is always in words. */
  label: string;
  /** For a live region (role="status"). Empty while idle. */
  announcement: string;
  copy(text: string): Promise<void>;
}

/** Copy to the clipboard with a confirmation that returns to idle after `resetMs`. State and wording come from @ejm/core. */
export function useClipboard(resetMs = 2000): Clipboard {
  const [{ machine, copy, clear }] = useState(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const c = createCopy({
      write: text => navigator.clipboard.writeText(text),
      resetMs,
      schedule: (fn, ms) => {
        const t = setTimeout(() => {
          timers.delete(t);
          fn();
        }, ms);
        timers.add(t);
        return t;
      },
      cancel: h => {
        clearTimeout(h as ReturnType<typeof setTimeout>);
        timers.delete(h as ReturnType<typeof setTimeout>);
      },
    });
    return { machine: c.machine, copy: c.copy, clear: () => timers.forEach(clearTimeout) };
  });
  useEffect(() => clear, [clear]);
  const state = useSyncExternalStore(machine.subscribe, machine.getState, () => 'idle' as CopyState);
  return { state, label: copyLabel(state), announcement: copyAnnouncement(state), copy };
}
