# Motion

Transform and opacity only. No animation library: CSS keyframes from `styles.css` and one `IntersectionObserver`. Under reduced motion, with scripts off, and in print, every element is in its final state.

| Export | What it does |
| --- | --- |
| `Reveal` | `<Reveal as="section" from="up\|fade\|scale\|left" index={0..8} delay={ms}>`. Plays once when it scrolls into view. |
| `useReveal({ watchdogMs })` | The hook behind `Reveal`. Put the returned ref on any element. |
| `Stagger` | `<Stagger as="ul" effect="enter\|reveal\|fade">`. Gives each child element the effect class and `--ejm-i` by position. CSS only, for what is on screen at load. |
| `staggerStyle(i, delayMs?)` | The `--ejm-i` and `--ejm-delay` style for one step. The index stops at 8, so a staged entrance is at most 8 x 60 + 640 = 1120ms. |
| `useDrawOn()` | Ref for an inline `<svg class="art">` or an element around it. Adds `draw-on` when it is first seen. `Art` uses it for `drawOn`, which is the way a guarded consumer reaches it. |

## Closed props

`Reveal` and `Stagger` are closed. `as` is one of `div` (default), `section`, `ul`, `ol` or `li`. Besides their effect props (`from`, `index`, `delay`, `effect`) they take `children`, an `id` and ARIA attributes (`aria-label`, `aria-labelledby`), so a wrapper can be labelled or referenced. They take no `className`, `style` or event props. To animate a heading, put it inside a `Reveal` rather than passing `as="h2"`. `Stagger` adds its effect class and `--ejm-i` to each child element it is given, so give it plain elements (`li`, `p`, `div`).

## The reveal contract (THEME.md)

1. The server render and the first client render carry no `data-reveal`. With no JavaScript nothing is hidden.
2. Before first paint (`useLayoutEffect`), an element whose top is below the fold gets `data-reveal="pending"`, which the CSS hides. Elements already on screen, or scrolled past, are left alone.
3. When it enters the viewport the element gets `data-reveal="in"`, plays `ejm-reveal` once, and the observer disconnects.
4. If the observer does not answer at all within `watchdogMs` (default 1000ms) the element is shown. Once the observer has answered, the watchdog stops, so the reveal still waits for the visitor to scroll. An element scrolled past without being seen (an anchor jump) is shown too.
5. Reduced motion: the hook does nothing, and the CSS only hides `pending` when `prefers-reduced-motion: no-preference`.

## Accessibility notes

- Nothing that carries meaning is ever the only thing that moves. A reveal never changes reading order or focus order.
- `Reveal` and `Stagger` add no ARIA of their own and no extra elements beyond the tag you choose. The ARIA attributes you pass are kept.
- Keep `index` for siblings that appear together; do not stagger long lists past 8 steps.
