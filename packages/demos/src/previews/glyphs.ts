/** The terminal glyphs of ejm-cli. A copy of the engine's tables, so the views do not import the engine; `frames.test.ts` checks they match. */
export const glyphs = {
  unicode: { prompt: '›', run: '●', done: '✓', fail: '✗', tool: '▸', up: '↑', sep: '·', dots: '…', tl: '╭', tr: '╮', bl: '╰', br: '╯', v: '│', hz: '─', spin: [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'] },
  ascii: { prompt: '>', run: '*', done: '+', fail: 'x', tool: '>', up: '^', sep: '-', dots: '...', tl: '+', tr: '+', bl: '+', br: '+', v: '|', hz: '-', spin: ['*'] },
};
export type Glyphs = typeof glyphs.unicode;
