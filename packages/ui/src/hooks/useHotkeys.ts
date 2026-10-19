import { useEffect, useRef, type RefObject } from 'react';

export interface Hotkey {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  mod: boolean;
}

/** "mod+k", "shift+?", "/", "escape". `mod` is Command on Apple platforms and Control elsewhere. */
export function parseHotkey(combo: string): Hotkey {
  const parts = combo.toLowerCase().split('+').map(p => p.trim());
  const key = parts.pop() ?? '';
  const has = (m: string) => parts.includes(m);
  return { key: key === 'space' ? ' ' : key, ctrl: has('ctrl'), meta: has('meta') || has('cmd'), alt: has('alt') || has('option'), shift: has('shift'), mod: has('mod') };
}

export function matchHotkey(h: Hotkey, e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, isApple: boolean): boolean {
  if (e.key.toLowerCase() !== h.key) return false;
  const wantMeta = h.meta || (h.mod && isApple);
  const wantCtrl = h.ctrl || (h.mod && !isApple);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl || e.altKey !== h.alt) return false;
  // Shift is part of how symbols like "?" are typed, so it only has to match for letters and named keys.
  return h.key.length === 1 && !/[a-z]/.test(h.key) ? true : e.shiftKey === h.shift;
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
const isApplePlatform = () => typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

export interface HotkeyOptions {
  /** Listen only inside this element (or ref). Default: the whole document. */
  scope?: RefObject<HTMLElement | null> | HTMLElement | null;
  enabled?: boolean;
  /** Call preventDefault when a binding fires. Default true. */
  preventDefault?: boolean;
}

/**
 * Keyboard shortcuts. Bindings are read fresh on every key, so inline handlers are fine. Keys typed into inputs,
 * textareas, selects and editable text are ignored, except Escape and combos that use Ctrl or Command.
 */
export function useHotkeys(bindings: Record<string, (event: KeyboardEvent) => void>, { scope, enabled = true, preventDefault = true }: HotkeyOptions = {}): void {
  const latest = useRef(bindings);
  latest.current = bindings;
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const el = scope === undefined ? document : scope && 'current' in scope ? scope.current : scope;
    if (!el) return;
    const onKey = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.defaultPrevented || e.isComposing) return;
      const apple = isApplePlatform();
      for (const [combo, handler] of Object.entries(latest.current)) {
        const h = parseHotkey(combo);
        if (!matchHotkey(h, e, apple)) continue;
        if (isTyping(e.target) && h.key !== 'escape' && !(h.mod || h.ctrl || h.meta)) continue;
        if (preventDefault) e.preventDefault();
        handler(e);
        return;
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [scope, enabled, preventDefault]);
}
