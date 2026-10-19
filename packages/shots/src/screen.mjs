// A terminal emulator (xterm.js, headless) that the recorded PTY bytes are fed into.
import xterm from '@xterm/headless';

const { Terminal } = xterm;

/**
 * @typedef {{ ch: string, width: number, fg: number | null, bg: number | null, fgRgb: boolean, bgRgb: boolean,
 *   bold: boolean, dim: boolean, italic: boolean, underline: boolean, strike: boolean, inverse: boolean, hidden: boolean }} Cell
 */

export class Screen {
  /** @param {number} cols @param {number} rows */
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.term = new Terminal({ cols, rows, scrollback: 0, allowProposedApi: true, convertEol: false });
    this.cursorVisible = true;
  }

  /** @param {string} data @returns {Promise<void>} */
  write(data) {
    for (const m of data.matchAll(/\x1b\[\?25([hl])/g)) this.cursorVisible = m[1] === 'h';
    return new Promise(resolve => this.term.write(data, resolve));
  }

  /** Text of each row with trailing spaces removed, trailing blank rows dropped. */
  lines() {
    const buf = this.term.buffer.active;
    const out = [];
    for (let y = 0; y < this.rows; y++) out.push((buf.getLine(y)?.translateToString(true) ?? '').replace(/\s+$/, ''));
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  }

  /** @returns {Cell[][]} one array per row; a wide character is followed by a zero-width placeholder that is omitted */
  grid() {
    const buf = this.term.buffer.active;
    const rows = [];
    for (let y = 0; y < this.rows; y++) {
      const line = buf.getLine(y);
      /** @type {Cell[]} */
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        const c = line?.getCell(x);
        if (!c) { row.push(blank()); continue; }
        const width = c.getWidth();
        if (width === 0) continue;
        row.push({
          ch: c.getChars() || ' ', width,
          fg: c.isFgDefault() ? null : c.getFgColor(), fgRgb: c.isFgRGB(),
          bg: c.isBgDefault() ? null : c.getBgColor(), bgRgb: c.isBgRGB(),
          bold: !!c.isBold(), dim: !!c.isDim(), italic: !!c.isItalic(), underline: !!c.isUnderline(),
          strike: !!c.isStrikethrough(), inverse: !!c.isInverse(), hidden: !!c.isInvisible(),
        });
      }
      rows.push(row);
    }
    return rows;
  }

  cursor() {
    const b = this.term.buffer.active;
    return { x: b.cursorX, y: b.cursorY, visible: this.cursorVisible };
  }

  dispose() { this.term.dispose(); }
}

/** @returns {Cell} */
function blank() {
  return { ch: ' ', width: 1, fg: null, bg: null, fgRgb: false, bgRgb: false, bold: false, dim: false, italic: false, underline: false, strike: false, inverse: false, hidden: false };
}
