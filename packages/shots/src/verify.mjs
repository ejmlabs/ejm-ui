// Checks that what the emulator drew is what the program printed.
import { stripVTControlCharacters } from 'node:util';

const trimEnd = (/** @type {string} */ l) => l.replace(/\s+$/, '');
const dropBlankTail = (/** @type {string[]} */ rows) => { while (rows.length && rows[rows.length - 1] === '') rows.pop(); return rows; };

/** The recorded byte stream as plain text lines: escape sequences removed, CRLF folded, trailing space and blank lines dropped. */
export function transcriptLines(/** @type {string} */ raw) {
  return dropBlankTail(stripVTControlCharacters(raw).replace(/\r\n?/g, '\n').split('\n').map(trimEnd));
}

/**
 * A second, independent reading of the byte stream for programs that paint by cursor addressing (a TUI).
 * It models only printable text, CR, LF, CUP (move to row;col) and erase-to-end-of-line / erase-screen, and ignores
 * styling (SGR) and mode switches (DECSET). Anything else is reported in `unsupported`, so a stream this
 * reader cannot follow fails the comparison instead of passing by accident. Every character counts as one cell.
 * @returns {{ rows: string[], unsupported: string[] }}
 */
export function replayCursorStream(/** @type {string} */ raw, /** @type {number} */ cols, /** @type {number} */ rows) {
  /** @type {string[][]} */
  const grid = Array.from({ length: rows }, () => /** @type {string[]} */ (Array(cols).fill(' ')));
  const at = (/** @type {number} */ y) => /** @type {string[]} */ (grid[y]);
  let r = 0, c = 0;
  const unsupported = new Set();
  const re = /\x1b\[([0-9;?:]*)([ -/]*[@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]|([\s\S])/gu;
  for (const m of raw.matchAll(re)) {
    if (m[3] !== undefined) {
      const ch = m[3];
      if (ch === '\r') c = 0;
      else if (ch === '\n') { if (r === rows - 1) { grid.shift(); grid.push(Array(cols).fill(' ')); } else r++; }
      else if (ch >= ' ') { if (c < cols) at(r)[c] = ch; c++; }
    } else if (m[2] !== undefined) {
      const [p1 = '', p2 = ''] = (m[1] ?? '').split(';');
      const f = m[2];
      if (f === 'H' || f === 'f') { r = Math.min(rows - 1, Math.max(0, (Number(p1) || 1) - 1)); c = Math.max(0, (Number(p2) || 1) - 1); }
      else if (f === 'K' && !p1.startsWith('?')) { const n = Number(p1) || 0; for (let x = n === 1 ? 0 : c; x < (n === 1 ? c + 1 : cols); x++) at(r)[x] = ' '; if (n === 2) at(r).fill(' '); }
      else if (f === 'J' && Number(p1) === 2) for (const row of grid) row.fill(' ');
      else if (f !== 'm' && f !== 'h' && f !== 'l') unsupported.add(`CSI ${m[1]}${f}`);
    }
  }
  return { rows: dropBlankTail(grid.map(row => trimEnd(row.join('')))), unsupported: [...unsupported] };
}

/**
 * Compares the final screen text with the PTY transcript.
 *
 * "exact": for programs that only print forward (no cursor addressing), the screen rows must equal the
 * transcript lines one for one. This is what a one-shot command like `ejm-cli --replay run Hello` must pass.
 *
 * "replayed": a TUI repaints cells with cursor moves and sends only the cells that changed, so the stripped byte
 * stream is not the screen. There the screen must equal what replayCursorStream rebuilds from the same bytes with
 * its own small interpreter. That is a check of the emulator (xterm.js) by a second reader, not a check of the
 * program's intent.
 *
 * @param {string[]} screen rows of the final screen (see Screen.lines)
 * @param {string} raw the recorded session
 * @returns {{ mode: 'exact' | 'replayed' | 'failed', ok: boolean, detail: string }}
 */
export function compareToTranscript(/** @type {string[]} */ screen, /** @type {string} */ raw, cols = 100, rows = 30) {
  const want = dropBlankTail(screen.map(trimEnd));
  const same = (/** @type {string[]} */ a) => a.length === want.length && a.every((l, i) => l === want[i]);
  if (same(transcriptLines(raw))) return { mode: 'exact', ok: true, detail: '' };
  const replay = replayCursorStream(raw, cols, rows);
  if (same(replay.rows)) return { mode: 'replayed', ok: true, detail: '' };
  const i = Math.max(0, want.findIndex((l, k) => l !== replay.rows[k]));
  return { mode: 'failed', ok: false, detail: `row ${i + 1}: screen ${JSON.stringify(want[i])} vs replay ${JSON.stringify(replay.rows[i])}; unsupported sequences: ${replay.unsupported.join(', ') || 'none'}` };
}

/** The rows as the browser laid them out must equal the emulator rows (nothing dropped or reordered by the renderer). */
export function domMatches(/** @type {string[]} */ rowText, /** @type {string[]} */ screen, rowsShown = rowText.length) {
  const norm = (/** @type {string} */ s) => trimEnd(s.replace(/ /g, ' '));
  for (let i = 0; i < rowsShown; i++) if (norm(rowText[i] ?? '') !== (screen[i] ?? '')) return false;
  return true;
}
