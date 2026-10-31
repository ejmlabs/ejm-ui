import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { IllustrationLabel, illustrationLabel } from './Illustration';
import { shadowClass, type Elevation } from '../lib/elevation';

// A real capture of the real product (never a drawn window), as a figure with a hairline caption.
//
// Theme. A <picture media="(prefers-color-scheme)"> cannot follow data-theme, which the boot script always sets, so the dark and
// light variants are separate <picture>s and CSS shows one (the same rules as the `dark:` variant: data-theme, else the system).
//   - Not priority: both <img>s are loading="lazy". A display:none lazy image is never fetched, so only the visible variant downloads.
//   - Priority (the hero): a lazy image is found late, so the hero cannot be lazy, and prerendered HTML cannot know the theme.
//     The first <picture> ("system") is eager with fetchpriority high and picks its variant with <source media>, so the common
//     visitor (theme follows the system) downloads one image, found by the preload hint. The other two pictures are lazy and
//     show only when the page theme disagrees with the system (a visitor who toggled the theme). Cost: that visitor downloads
//     the system variant too, once. Rejected: content-visibility (it does not stop a fetch) and eager-both (always two downloads).
// The preload hint (shotPreloadLinks) mirrors the system picture, so it fetches the file the <img> will use.
//
// Illustration. A shot with kind "illustration" is a reconstruction, never a capture. It always shows the label "Illustration of
// <product>, not a screenshot" under the image (the caption prop cannot remove it), and its alt text says so.
//
// Shadow. A real app window capture has its own edge and gets none. `elevation` exists for a frameless capture; it uses the
// existing tokens (rest, raised, float) and nothing else. `frame` draws the page's own minimal terminal bar, for terminal captures only.

export type ShotTheme = 'dark' | 'light';

/** One theme of a shot. The srcsets use width descriptors. `width` and `height` are the CSS size of the smallest file. Same shape as @ejm/shots. */
export interface ShotVariantData {
  width: number;
  height: number;
  avif: string;
  webp: string;
  png: string;
  /** The smallest PNG, the <img> fallback. */
  src: string;
  /** Which of avif and webp to offer first. The browser takes the first it supports, so list the smaller one first. Default avif first. */
  order?: readonly ['avif', 'webp'] | readonly ['webp', 'avif'];
}

export interface ShotData {
  product: string;
  name: string;
  /** What the picture is made of. */
  surface: 'terminal' | 'window';
  /** A screenshot (default) is a real capture. An illustration is a reconstruction and always carries a visible label. */
  kind?: 'screenshot' | 'illustration';
  title: string;
  /** Built from the metadata by `shotCaption` in @ejm/shots. */
  caption: string;
  variants: Partial<Record<ShotTheme, ShotVariantData>>;
}

export interface ProductShotProps {
  /** From `getShot(product, name)` in @ejm/shots. */
  shot: ShotData;
  /** What the shot shows, in words. Required: a screenshot's meaning is not in its pixels. For an illustration it is prefixed with the label when it does not say "illustration". */
  alt: string;
  /** The hero image: eager, fetchpriority high, and pair it with `shotPreloadLinks` in the page head. */
  priority?: boolean;
  /** Draw the page's terminal bar (three dots and the title) around a terminal capture. Throws for a window capture. */
  frame?: boolean;
  /** Only for a capture with no window edge of its own. Never set it on a real app window capture or with `frame`. */
  elevation?: Elevation;
  /** Replaces the generated caption. `false` hides it (name the shot in surrounding text then). */
  caption?: ReactNode | false;
  /** The `sizes` attribute. Default: the shot's own width on wide screens, the viewport below that. */
  sizes?: string;
}


const MIME = { avif: 'image/avif', webp: 'image/webp' } as const;
const orderOf = (v: ShotVariantData) => v.order ?? (['avif', 'webp'] as const);
const defaultSizes = (w: number) => `(min-width: ${w}px) ${w}px, 100vw`;

/** The theme a missing variant falls back to: a shot captured in one theme only is shown in both. */
function pick(shot: ShotData, theme: ShotTheme): ShotVariantData {
  const v = shot.variants[theme] ?? shot.variants[theme === 'dark' ? 'light' : 'dark'];
  if (!v) throw new Error(`ProductShot: shot ${shot.product}/${shot.name} has no image`);
  return v;
}

function Pic({ v, alt, sizes, className, eager }: { v: ShotVariantData; alt: string; sizes: string; className?: string; eager?: boolean }) {
  return (
    <picture className={className}>
      {orderOf(v).map(f => <source key={f} type={MIME[f]} srcSet={v[f]} sizes={sizes} />)}
      <img
        src={v.src}
        srcSet={v.png}
        sizes={sizes}
        width={v.width}
        height={v.height}
        alt={alt}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        className="block h-auto max-w-full"
      />
    </picture>
  );
}

/** The system picture of a priority shot: one <picture> that picks the variant with <source media>. */
function SystemPic({ shot, alt, sizes, className }: { shot: ShotData; alt: string; sizes: string; className: string }) {
  const light = pick(shot, 'light');
  const dark = pick(shot, 'dark');
  return (
    <picture className={className} data-shot-system="">
      {orderOf(dark).map(f => <source key={`d${f}`} type={MIME[f]} media="(prefers-color-scheme: dark)" srcSet={dark[f]} sizes={sizes} />)}
      {orderOf(light).map(f => <source key={`l${f}`} type={MIME[f]} srcSet={light[f]} sizes={sizes} />)}
      <source media="(prefers-color-scheme: dark)" srcSet={dark.png} sizes={sizes} />
      <img src={light.src} srcSet={light.png} sizes={sizes} width={light.width} height={light.height} alt={alt} decoding="async" loading="eager" fetchPriority="high" className="block h-auto max-w-full" />
    </picture>
  );
}

/**
 * A real product capture as a figure. Dark and light variants follow the page theme; see the notes at the top of this file.
 * It has no card or panel: the image sits on the band and a hairline sets the caption off.
 */
export function ProductShot({ shot, alt, priority = false, frame = false, elevation, caption, sizes }: ProductShotProps) {
  if (frame && shot.surface !== 'terminal') throw new Error(`ProductShot: frame is for terminal captures only, and ${shot.product}/${shot.name} is a ${shot.surface} capture`);
  const illustration = shot.kind === 'illustration';
  if (illustration && frame) throw new Error(`ProductShot: ${shot.product}/${shot.name} is an illustration, and a terminal frame would make it look like a capture`);
  const words = illustration && !/illustration/i.test(alt) ? `${illustrationLabel(shot.product)}: ${alt}` : alt;
  const dark = pick(shot, 'dark');
  const light = pick(shot, 'light');
  const both = Boolean(shot.variants.dark && shot.variants.light);
  const sz = (v: ShotVariantData) => sizes ?? defaultSizes(v.width);
  const text = caption === undefined ? shot.caption : caption;

  const pics = !both ? (
    <Pic v={dark} alt={words} sizes={sz(dark)} eager={priority} />
  ) : priority ? (
    <>
      <SystemPic shot={shot} alt={words} sizes={sz(light)} className="block [@media(prefers-color-scheme:light)]:dark:hidden [@media(prefers-color-scheme:dark)]:[:root[data-theme=light]_&]:hidden" />
      <Pic v={dark} alt={words} sizes={sz(dark)} className="hidden [@media(prefers-color-scheme:light)]:dark:block" />
      <Pic v={light} alt={words} sizes={sz(light)} className="hidden [@media(prefers-color-scheme:dark)]:[:root[data-theme=light]_&]:block" />
    </>
  ) : (
    <>
      <Pic v={light} alt={words} sizes={sz(light)} className="block dark:hidden" />
      <Pic v={dark} alt={words} sizes={sz(dark)} className="hidden dark:block" />
    </>
  );

  return (
    <figure data-shot="" data-product={shot.product} data-kind={shot.kind ?? 'screenshot'} data-surface={shot.surface} className="m-0 min-w-0">
      <div className={cn('w-fit max-w-full', elevation && shadowClass[elevation], frame && 'scheme-page overflow-hidden rounded-window border border-ui-line')}>
        {frame && (
          <div aria-hidden="true" data-shot-frame="" className="flex items-center gap-3 border-b border-ui-line bg-ui-panel px-4 py-3">
            <span className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-ui-line-strong" />
              <span className="size-2.5 rounded-full bg-ui-line-strong" />
              <span className="size-2.5 rounded-full bg-ui-line-strong" />
            </span>
            <span className="text-meta min-w-0 truncate text-ui-text-strong">{shot.title}</span>
          </div>
        )}
        {pics}
      </div>
      {(illustration || (text !== false && text !== '')) && (
        <figcaption className="text-meta mt-3 max-w-measure hairline-t pt-2 text-muted">
          {illustration && <IllustrationLabel product={shot.product} />}
          {text !== false && text !== '' && (illustration ? <span className="block">{text}</span> : text)}
        </figcaption>
      )}
    </figure>
  );
}

/** A `<link>` for the page head: attribute names as HTML has them. A type alias (not an interface) so it fits `RouteHead.links` of @ejm/ssg. */
export type ShotPreloadLink = {
  rel: 'preload';
  as: 'image';
  type: 'image/avif' | 'image/webp';
  imagesrcset: string;
  imagesizes: string;
  fetchpriority: 'high';
  media?: string;
};

/**
 * Preload hints for a priority shot, to render in the page head. It mirrors the `ProductShot priority` <img>: the first
 * modern format only (a browser without it skips the hint and takes the next source in the picture), one hint per system scheme (dark, and everything else as light, like
 * the picture), each behind its media query, so one image is fetched. A shot with a single theme gets one hint with no media query.
 * Pass the same `sizes` you gave ProductShot, if any.
 */
export function shotPreloadLinks(shot: ShotData, sizes?: string): ShotPreloadLink[] {
  const link = (v: ShotVariantData, media?: string): ShotPreloadLink => ({
    rel: 'preload',
    as: 'image',
    type: MIME[orderOf(v)[0]],
    imagesrcset: v[orderOf(v)[0]],
    imagesizes: sizes ?? defaultSizes(v.width),
    fetchpriority: 'high',
    ...(media ? { media } : {}),
  });
  if (!(shot.variants.dark && shot.variants.light)) return [link(pick(shot, 'dark'))];
  return [link(shot.variants.dark, '(prefers-color-scheme: dark)'), link(shot.variants.light, 'not all and (prefers-color-scheme: dark)')];
}
