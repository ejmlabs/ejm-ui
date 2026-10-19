# Hooks

Strict TypeScript, React 19. Every hook is safe to render on the server: nothing touches `window` during render, and the server and hydration render a fixed default, then the real value arrives in the next render.

| Hook | Returns | Notes |
| --- | --- | --- |
| `useTheme(store?)` | `{ choice, resolved, setChoice(c), toggle() }` | `choice` is `light`, `dark` or `system`; `resolved` is what is on screen. |
| `useMediaQuery(query, serverDefault = false)` | `boolean` | Subscribes with `useSyncExternalStore`. |
| `useReducedMotion()` | `boolean` | `useMediaQuery("(prefers-reduced-motion: reduce)")`. CSS animations already switch off by themselves. |
| `useContainerQuery({ minWidth?, maxWidth? })` | `{ ref, width, matches }` | ResizeObserver. `width` is `null` and `matches` false until measured. |
| `useInView({ once?, rootMargin?, threshold? })` | `{ ref, inView }` | False on the server. Reports true where IntersectionObserver is missing, so nothing waits forever. |
| `useClipboard(resetMs = 2000)` | `{ state, label, announcement, copy(text) }` | State machine, wording and timing are `@ejm/core` (`createCopy`). Put `announcement` in a `role="status"` region. |
| `useHotkeys(bindings, { scope?, enabled?, preventDefault? })` | nothing | Bindings like `"mod+k"`, `"?"`, `"/"`, `"escape"`. `mod` is Command on Apple, Control elsewhere. |

## Theme

`useTheme` follows the contract in `THEME.md`:

- `theme-boot.js` has already set `data-theme` before first paint. The store reads the saved choice but changes nothing on screen until the visitor chooses.
- On `ejmlabs.com` and its subdomains the choice is the `ejm-theme` cookie with exactly the attributes of `THEME_COOKIE` from `@ejm/tokens`: `Domain=.ejmlabs.com; Path=/; Max-Age=31536000; SameSite=Lax`, plus `Secure` on https. Every ejmlabs site reads the same cookie.
- On any other host (localhost, previews) the cookie is host-only (no `Domain`) and the choice is also written to `localStorage["ejm-theme"]`, which is what `theme-boot.js` reads there.
- `system` clears the cookie and the stored value, and the page follows the OS from then on (a `matchMedia` listener updates `data-theme`). While a choice is saved, or when the URL has a `?theme=` test override, OS changes are ignored.
- Server render and hydration give `{ choice: "system", resolved: "light" }`. Do not branch on `resolved` for anything visible before hydration; use the `dark:` variant. `ThemeToggle` picks its icon that way.
- `createThemeStore(env)` takes every browser dependency as an argument, which is how the tests cover the cookie rules without a browser.

## Hotkeys

Keys typed into inputs, textareas, selects and editable text are ignored, except `escape` and combos that use Ctrl or Command. Shift is part of how symbols such as `?` are typed, so it only has to match for letters. With `scope` the listener is attached to that element (or ref) and hears only keys pressed inside it. Handlers are read fresh on every key, so inline functions are fine. The listener is removed on unmount and when `enabled` is false.

## Accessibility notes

- `useClipboard` names its state in words (`Copy`, `Copied`, `Copy failed`), never by color or an icon alone.
- `useHotkeys` never fires while someone types, and never when the event was already handled (`defaultPrevented`) or composing (IME).
- `useReducedMotion` is for motion done in script. Do not gate content on it.
