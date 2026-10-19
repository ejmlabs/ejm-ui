// Reads a shot's metadata file (<name>.json, written by the capture tools) into the shape the site and the honesty check use.
// The capture tools write their own field names; this is the one place that maps them, so a new tool only adds aliases here.
//
//   kind           screenshot (default) or illustration. An illustration is a labelled reconstruction, not a capture: it must not
//                  record a command, version, commit, binary or transcript.
//   surface        terminal or window (inferred: a terminal block or transcript means terminal)
//   product        folder name under assets/ (cli, harness, ide). `product` in the result is the display name (ejm-cli).
//   version        version | productVersion, without a leading product name ("ejm-cli 0.3.1" becomes "0.3.1")
//   commit         commit | gitCommit
//   date           date | captureDate, as YYYY-MM-DD
//   command        command (terminal shots), or captureMethod (window shots)
//   how            how: one plain sentence on how the capture was made
//   themes         themes: the list of themes captured, or the single theme in `theme`
//   scale          scale | size.scale | 2 (the capture tools render at device scale 2)
//   transcript     transcript | results.<theme>.transcript (terminal shots)
//   size           size.width/height | results.<theme>.pixelWidth/pixelHeight, in pixels of the PNG
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const str = v => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export const displayName = id => (id.startsWith('ejm-') ? id : `ejm-${id}`);

/** @returns {{ meta: object, problems: string[] }} meta is normalized even when fields are missing; `problems` lists what is missing or malformed. */
export function normalizeMeta(raw, id) {
  const problems = [];
  const need = (field, ok, hint) => { if (!ok) problems.push(`missing ${field}: ${hint}`); };
  const kind = raw.kind ?? 'screenshot';
  if (kind !== 'screenshot' && kind !== 'illustration') problems.push(`kind: "${kind}" is not screenshot or illustration`);
  const illustration = kind === 'illustration';
  // What the picture is made of: a terminal capture or an app window. Inferred for terminal shots, which carry a terminal block or transcript.
  const surface = raw.surface ?? (raw.terminal || raw.transcript !== undefined || raw.results?.dark?.transcript !== undefined || raw.results?.light?.transcript !== undefined ? 'terminal' : 'window');
  const isTerminal = surface === 'terminal';

  const themes = Array.isArray(raw.themes) ? raw.themes : raw.theme ? [raw.theme] : [];
  need('theme', themes.length > 0 && themes.every(t => t === 'dark' || t === 'light'), 'list the theme or themes captured (dark, light)');

  const product = str(raw.product);
  need('product', Boolean(product), 'name the product');

  const command = str(raw.command);
  const method = str(raw.captureMethod);
  const version = str(raw.version ?? raw.productVersion)?.replace(/^[a-z][\w-]*\s+(?=v?\d)/i, '');
  const commit = str(raw.commit ?? raw.gitCommit);
  const stamp = str(raw.date ?? raw.captureDate);
  const date = stamp?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const how = str(raw.how);
  need('how', Boolean(how), illustration ? 'say in one sentence what the illustration was drawn from' : 'say in one sentence how the capture was made');
  need('date', Boolean(date), illustration ? 'record the date it was drawn (YYYY-MM-DD)' : 'record the capture date (YYYY-MM-DD or an ISO timestamp)');

  if (illustration) {
    // An illustration is not a capture, so it may not look like one: no command, version, commit, binary or transcript.
    const claims = ['command', 'captureMethod', 'version', 'productVersion', 'commit', 'gitCommit', 'binary', 'transcript', 'terminal'].filter(k => raw[k] !== undefined)
      .concat(themes.filter(t => raw.results?.[t]?.transcript !== undefined).map(t => `results.${t}.transcript`));
    if (claims.length) problems.push(`illustration claims a capture (${claims.join(', ')}): an illustration records no command, version, commit, binary or transcript`);
  } else {
    need('command', Boolean(command || method), isTerminal ? 'record the exact command' : 'record the command or the capture method');
    need('version or commit', Boolean(version || commit), 'record the product version or git commit the capture shows');
  }

  const scale = Number(raw.scale ?? raw.size?.scale ?? 2);
  if (!(Number.isFinite(scale) && scale >= 1)) problems.push('scale: must be a number of at least 1');

  const transcripts = {};
  for (const t of themes) {
    const text = raw.results?.[t]?.transcript ?? (typeof raw.transcript === 'object' ? raw.transcript?.[t] : raw.transcript);
    if (typeof text === 'string' && text.trim()) transcripts[t] = text;
  }
  if (isTerminal && !illustration) need('transcript', themes.every(t => transcripts[t]), 'terminal shots keep the text on screen, per theme');

  const sizes = {};
  for (const t of themes) {
    const w = raw.results?.[t]?.pixelWidth ?? raw.size?.[t]?.width ?? raw.size?.width;
    const h = raw.results?.[t]?.pixelHeight ?? raw.size?.[t]?.height ?? raw.size?.height;
    if (Number.isFinite(w) && Number.isFinite(h)) sizes[t] = { width: w, height: h };
  }
  need('size', themes.every(t => sizes[t]), 'record the image size in pixels, per theme (results.<theme>.pixelWidth and pixelHeight, or size.width and size.height)');

  const name = product ? displayName(product) : displayName(id);
  const meta = {
    product: name,
    kind: illustration ? 'illustration' : 'screenshot',
    surface,
    title: str(raw.title) ?? name,
    ...(str(raw.caption) ? { caption: str(raw.caption) } : {}),
    command: illustration ? '' : (command ?? method ?? ''),
    ...(version && !illustration ? { version } : {}),
    ...(commit && !illustration ? { commit } : {}),
    date: date ?? '',
    how: how ?? '',
    themes,
    scale,
  };
  return { meta, problems, transcripts, sizes, workingTreeChanges: Number.isFinite(raw.workingTreeChanges) ? raw.workingTreeChanges : undefined };
}

/** Reads <dir>/<id>/<name>.json. */
export function readShotMeta(dir, id, name) {
  const file = join(dir, id, `${name}.json`);
  if (!existsSync(file)) return { missing: true, file };
  try {
    return { raw: JSON.parse(readFileSync(file, 'utf8')), file };
  } catch (e) {
    return { invalid: e.message, file };
  }
}
