import { describe, expect, it } from 'vitest';
import { checkAll, checkBands, checkBoard, checkUi } from '../scripts/contrast.mjs';
import { loadTheme, ratio } from '../scripts/theme.mjs';

const { theme, brand } = loadTheme();
const bad = (edit: (t: any) => void) => { const t = structuredClone(theme); edit(t); return t; };

describe('contrast gates', () => {
  it('pass for the shipped theme, both themes and every band', () => {
    expect(checkAll(theme, brand)).toEqual([]);
    const { rows } = checkBands(theme, brand);
    expect(rows.length).toBeGreaterThan(200);
  });

  it('keep the brand pair Ink on Sage at 4.5:1 or better', () => {
    expect(ratio(brand.ink!, brand.sage!)).toBeGreaterThanOrEqual(4.5);
  });

  it('fail on a muted color that is too light, naming the band, theme and pair', () => {
    const t = bad(x => { x.web.bands.mist.light.muted = 'brand.sage'; });
    expect(checkBands(t, brand).problems.join('\n')).toMatch(/mist\/light: muted on ground is \d\.\d\d:1, needs 4\.5:1/);
  });

  it('fail when Forest is used as ordinary text on Sage', () => {
    const t = bad(x => { x.web.bands.sage.light.link = 'brand.forest'; });
    expect(checkBands(t, brand).problems.join('\n')).toMatch(/sage\/light: link on ground/);
  });

  it('fail when the Sage band flips to another ground in the dark theme', () => {
    const t = bad(x => { x.web.bands.sage.dark = { ...x.web.bands.sage.light, ground: 'brand.forest' }; });
    expect(checkBands(t, brand).problems.join('\n')).toMatch(/sage\/dark: the sage band must keep the brand sage ground/);
  });

  it('fail on a focus ring under 3:1, a weak control border and a weak on-primary', () => {
    const t = bad(x => {
      x.web.bands.ink.light.focus = 'brand.forest';
      x.web.bands.paper.dark.control = 'dark.line';
      x.web.bands.paper.light.onPrimary = 'brand.sage';
    });
    const text = checkBands(t, brand).problems.join('\n');
    expect(text).toMatch(/ink\/light: focus on ground/);
    expect(text).toMatch(/paper\/dark: control on ground/);
    expect(text).toMatch(/paper\/light: on-primary on primary/);
  });

  it('fail when a board square hides black pieces, a label or mark vanishes or the squares merge', () => {
    expect(checkBoard(theme)).toEqual([]);
    const text = checkBoard(bad(x => {
      x.themes.dark.roles['board-dark'] = '2A322C';
      x.themes.light.roles['board-mark'] = '8A9A7B';
      x.themes.light.roles['board-light'] = '9AA98B';
      x.themes.dark.roles['board-on-light'] = '57665B';
    })).join('\n');
    expect(text).toMatch(/dark: black pieces on the dark square are \d\.\d\d:1, need 3:1/);
    expect(text).toMatch(/light: board-mark on the light square/);
    expect(text).toMatch(/light: the board squares are \d\.\d\d:1 apart/);
    expect(text).toMatch(/dark: board-on-light on the light square is \d\.\d\d:1, needs 4\.5:1/);
  });

  it('fail when the danger Button, drawn at 85 percent on its hover, leaves its text under 4.5:1', () => {
    expect(checkBands(theme, brand).problems).toEqual([]);
    const t = bad(x => { x.web.bands.paper.light.danger = 'light.error'; });
    expect(checkBands(t, brand).problems.join('\n')).toMatch(/paper\/light: on-danger on danger hover is 4\.41:1, needs 4\.5:1/);
  });

  it('fail on a ui theme text color under 4.5:1', () => {
    const t = bad(x => { x.themes.dark.roles['text-muted'] = '57665B'; });
    expect(checkUi(t).join('\n')).toMatch(/dark: text-muted on ground/);
  });
});
