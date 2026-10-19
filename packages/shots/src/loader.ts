// The consumer side of the shots pipeline: turns generated/shots.json plus the bundler's file URLs into the data ProductShot needs.
// Kept free of Vite so tests can feed it any index. src/index.ts binds it to the real generated folder.

export type ShotTheme = 'dark' | 'light';
/** What the picture is made of. */
export type ShotSurface = 'terminal' | 'window';
/** A real capture, or a labelled reconstruction. */
export type ShotKind = 'screenshot' | 'illustration';

/** A shot's metadata as the index keeps it (see scripts/shot-meta.mjs, which maps the capture tools' fields). The transcript stays in assets/. */
export interface ShotMeta {
  /** Display name, for example ejm-cli. */
  product: string;
  kind: ShotKind;
  surface: ShotSurface;
  /** Short title, used as the terminal frame title. */
  title: string;
  /** One sentence on what the shot shows, shown before the product and date in the caption. */
  caption?: string;
  command: string;
  version?: string;
  commit?: string;
  /** Capture date, YYYY-MM-DD. */
  date: string;
  how: string;
  themes: ShotTheme[];
  /** Device scale of the PNG. */
  scale: number;
}

interface IndexFile { file: string; format: 'avif' | 'webp' | 'png'; width: number; height: number; bytes: number; sha256: string }
interface IndexTheme { source: { file: string; sha256: string; width: number; height: number; bytes: number }; width: number; height: number; widths: number[]; files: IndexFile[] }
export interface ShotsIndex { format: 1; pipeline: string; shots: Record<string, { meta: ShotMeta; themes: Partial<Record<ShotTheme, IndexTheme>> }> }

/** One theme of one shot. `avif`, `webp` and `png` are srcset strings with width descriptors. `width` and `height` are the CSS size of the 1x file. */
export interface ShotVariant {
  width: number;
  height: number;
  avif: string;
  webp: string;
  png: string;
  src: string;
  /** Which modern format to offer first: the one with fewer bytes. Terminal text is smaller as lossless WebP than as lossy AVIF. */
  order: ['avif', 'webp'] | ['webp', 'avif'];
  bytes: { avif: number[]; webp: number[]; png: number[] };
}

export interface Shot {
  product: string;
  name: string;
  kind: ShotKind;
  surface: ShotSurface;
  title: string;
  caption: string;
  meta: ShotMeta;
  variants: Partial<Record<ShotTheme, ShotVariant>>;
}

/** "ejm-cli 0.3.1, captured 2026-10-18." for a screenshot, with the capture's own sentence first when the metadata has one. */
export function shotCaption(meta: Pick<ShotMeta, 'product' | 'version' | 'commit' | 'date' | 'caption'> & { kind?: ShotKind }): string {
  // An illustration was never captured, so it gets no version and no capture date: ProductShot adds its own label.
  if (meta.kind === 'illustration') return meta.caption?.trim() ?? '';
  const rev = [meta.version, meta.commit && (meta.version ? `(${meta.commit.slice(0, 7)})` : `commit ${meta.commit.slice(0, 7)}`)].filter(Boolean).join(' ');
  const own = meta.caption?.trim();
  return `${own ? (/[.!?]$/.test(own) ? own : own + '.') + ' ' : ''}${meta.product}${rev ? ' ' + rev : ''}, captured ${meta.date}.`;
}

/** `urlOf` maps an index file name (ejm-cli/read.dark.960w.avif) to the URL the bundler gave it. */
export function createShots(index: ShotsIndex, urlOf: (file: string) => string) {
  const srcset = (files: IndexFile[], format: IndexFile['format']) =>
    files.filter(f => f.format === format).sort((a, b) => a.width - b.width).map(f => `${urlOf(f.file)} ${f.width}w`).join(', ');
  const sizes = (files: IndexFile[], format: IndexFile['format']) => files.filter(f => f.format === format).sort((a, b) => a.width - b.width).map(f => f.bytes);

  function getShot(product: string, name: string): Shot {
    const key = `${product}/${name}`;
    const entry = index.shots[key];
    if (!entry) throw new Error(`No shot "${key}". Known shots: ${Object.keys(index.shots).join(', ') || 'none'}. Capture it, then run: node packages/shots/scripts/optimize.mjs`);
    const variants: Shot['variants'] = {};
    for (const [theme, t] of Object.entries(entry.themes) as [ShotTheme, IndexTheme][]) {
      const small = t.files.filter(f => f.format === 'png').sort((a, b) => a.width - b.width)[0];
      const total = (f: IndexFile['format']) => t.files.filter(x => x.format === f).reduce((n, x) => n + x.bytes, 0);
      variants[theme] = {
        width: t.width,
        height: t.height,
        avif: srcset(t.files, 'avif'),
        webp: srcset(t.files, 'webp'),
        png: srcset(t.files, 'png'),
        src: small ? urlOf(small.file) : '',
        order: total('webp') < total('avif') ? ['webp', 'avif'] : ['avif', 'webp'],
        bytes: { avif: sizes(t.files, 'avif'), webp: sizes(t.files, 'webp'), png: sizes(t.files, 'png') },
      };
    }
    return { product: entry.meta.product, name, kind: entry.meta.kind, surface: entry.meta.surface, title: entry.meta.title ?? entry.meta.product, caption: shotCaption(entry.meta), meta: entry.meta, variants };
  }

  return { getShot, listShots: () => Object.keys(index.shots) };
}
