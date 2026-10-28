import { Box, Text as InkText, useStdout } from "ink";
import { contract, displayWidth, truncate, type CommandMenuState, type MessageKind, type ToolCallState } from "@ejm/core";
import type { Seg } from "./layout";
import { DEFAULT_COLUMNS, useEjm, type EjmTheme, type Role } from "./theme";

// Conversation blocks for terminal agents: Message, ToolCall, Markdown and CommandMenu.
// Each builds plain lines of segments first, so widths are exact and the same rules as the Rust
// target apply. Lines never exceed the available columns.

const G = contract.glyphs;
const T = contract.text;
const GUTTER = 2;
const TOOL_PREVIEW_LINES = 4;
const TOOL_ERROR_LINES = 8;

/** A segment that may also be italic. Only Markdown quotes use it. */
type Span = Seg & { italic?: boolean };
type Lines = Span[][];

function useColumns() {
  const { theme, columns } = useEjm();
  const { stdout } = useStdout();
  return { theme, columns: Math.max(1, columns ?? (stdout as NodeJS.WriteStream | undefined)?.columns ?? DEFAULT_COLUMNS) };
}

/** Text from models, tools or files may carry escape sequences. Keep newlines, drop other controls. */
// eslint-disable-next-line no-control-regex
const clean = (text: string): string => text.replace(/\t/g, "    ").replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, "");

const spaces = (n: number) => " ".repeat(Math.max(0, n));
const lineWidth = (line: readonly Span[]) => line.reduce((n, s) => n + displayWidth(s.text), 0);

function push(line: Span[], text: string, style: Omit<Span, "text">) {
  const last = line[line.length - 1];
  if (last && last.role === style.role && last.bold === style.bold && last.italic === style.italic) last.text += text;
  else line.push({ ...style, text });
}

/** A wrapped line without the spaces left where it broke. */
function finish(line: Span[]): Span[] {
  const last = line[line.length - 1];
  if (last) last.text = last.text.replace(/ +$/, "");
  return line;
}

/**
 * Word-wrap styled spans to `width` columns. `first` starts the first line and `rest` every
 * continuation line. Words wider than a line break by column.
 */
export function wrapSpans(spans: readonly Span[], first: readonly Span[], rest: readonly Span[], width: number): Lines {
  const lines: Lines = [];
  const restWidth = lineWidth(rest);
  let current: Span[] = first.map((s) => ({ ...s }));
  let used = lineWidth(current);
  let fresh = true;
  const breakLine = () => {
    lines.push(finish(current));
    current = rest.map((s) => ({ ...s }));
    used = restWidth;
  };
  for (const span of spans) {
    const { text, ...style } = span;
    for (const token of text.match(/ +|[^ ]+/g) ?? []) {
      const w = displayWidth(token);
      const space = token.startsWith(" ");
      if (used + w > width && !fresh) {
        breakLine();
        fresh = true;
        if (space) continue;
      }
      if (used + w <= width || space) {
        push(current, token, style);
        used += w;
      } else {
        for (const ch of token) {
          const cw = displayWidth(ch);
          if (used + cw > width && used > restWidth) breakLine();
          push(current, ch, style);
          used += cw;
        }
      }
      fresh = false;
    }
  }
  lines.push(finish(current));
  return lines;
}

/** Preformatted text broken by column, for code, diffs and tables. */
function wrapColumns(text: string, style: Omit<Span, "text">, first: readonly Span[], rest: readonly Span[], width: number): Lines {
  const lines: Lines = [];
  let prefix: Span[] = first.map((s) => ({ ...s }));
  let row = "";
  let used = lineWidth(prefix);
  for (const ch of text) {
    const cw = displayWidth(ch);
    if (used + cw > width && row) {
      lines.push([...prefix, { ...style, text: row }]);
      prefix = rest.map((s) => ({ ...s }));
      row = "";
      used = lineWidth(prefix);
    }
    row += ch;
    used += cw;
  }
  lines.push([...prefix, { ...style, text: row }]);
  return lines;
}

/** Role of one diff line, or undefined when it is not a diff line. */
function diffRole(text: string): Role | undefined {
  if (["+++", "---", "diff --git", "index "].some((p) => text.startsWith(p))) return "dim";
  if (text.startsWith("@@")) return "info";
  if (text.startsWith("+")) return "success";
  if (text.startsWith("-")) return "error";
  return undefined;
}

const looksLikeDiff = (lines: readonly string[]) => lines.some((l) => l.startsWith("@@ ") || l.startsWith("diff --git "));

// Markdown --------------------------------------------------------------------------------------

/** Inline Markdown: `**bold**`, `*italic*` and `code`. Unclosed markers stay literal. */
function inline(text: string, base: Omit<Span, "text">): Span[] {
  const spans: Span[] = [];
  let plain = "";
  let rest = text;
  const flush = () => {
    if (plain) spans.push({ ...base, text: plain });
    plain = "";
  };
  while (rest) {
    let marked: { open: number; end: number; style: Omit<Span, "text"> } | undefined;
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) marked = { open: 1, end: end - 1, style: { role: "accent" } };
    } else if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 2) marked = { open: 2, end: end - 2, style: { ...base, bold: true } };
    } else if (rest.startsWith("*") && !rest.startsWith("* ")) {
      const end = rest.indexOf("*", 1);
      if (end > 1) marked = { open: 1, end: end - 1, style: { ...base, italic: true } };
    }
    if (marked) {
      flush();
      spans.push({ ...marked.style, text: rest.slice(marked.open, marked.open + marked.end) });
      rest = rest.slice(marked.open * 2 + marked.end);
    } else {
      const ch = String.fromCodePoint(rest.codePointAt(0)!);
      plain += ch;
      rest = rest.slice(ch.length);
    }
  }
  flush();
  return spans;
}

const isRule = (text: string) => /^(-{3,}|\*{3,}|_{3,})\s*$/.test(text);

/** Lines of light Markdown. `gutter` starts the first line; continuation lines indent by its width. */
export function markdownLines(theme: EjmTheme, text: string, width: number, gutter: readonly Span[] = []): Lines {
  const indentWidth = lineWidth(gutter);
  const indent = (): Span[] => (indentWidth ? [{ text: spaces(indentWidth) }] : []);
  const raws = clean(text).split("\n");
  const bareDiff = text.startsWith("diff --git ") || text.startsWith("@@ ");
  const out: Lines = [];
  let fence: boolean | undefined;
  raws.forEach((raw, index) => {
    const lead: Span[] = index === 0 ? gutter.map((s) => ({ ...s })) : indent();
    const trimmed = raw.trimStart();
    if (trimmed.startsWith("```")) {
      const info = trimmed.slice(3).trim();
      fence = fence === undefined ? info === "diff" || info === "patch" || (info === "" && text.includes("\n@@ ")) : undefined;
      // The fence itself is noise once the code is set apart by indent and color.
      if (index === 0) out.push(lead);
      return;
    }
    if (fence !== undefined) {
      const role = (fence && diffRole(raw)) || "dim";
      out.push(...wrapColumns(raw, { role }, [...lead, { text: "  " }], [{ text: spaces(indentWidth + 2) }], width));
      return;
    }
    if (bareDiff && diffRole(raw)) {
      out.push(...wrapColumns(raw, { role: diffRole(raw) }, lead, indent(), width));
      return;
    }
    const pad = spaces(Math.min(8, raw.length - trimmed.length));
    let m: RegExpMatchArray | null;
    if (trimmed.startsWith("#")) {
      out.push(...wrapSpans(inline(trimmed.replace(/^#+\s*/, ""), { role: "accent", bold: true }), lead, indent(), width));
    } else if (isRule(trimmed)) {
      out.push([...lead, { text: theme.glyph(G.rule).repeat(Math.min(40, Math.max(0, width - indentWidth))), role: "dim" }]);
    } else if ((m = trimmed.match(/^[-*+] (.*)$/))) {
      const bullet = `${pad}- `;
      out.push(...wrapSpans(inline(m[1]!, {}), [...lead, { text: bullet }], [{ text: spaces(indentWidth + displayWidth(bullet)) }], width));
    } else if ((m = trimmed.match(/^(\d{1,3}[.)]) (.*)$/))) {
      const marker = `${pad}${m[1]} `;
      out.push(...wrapSpans(inline(m[2]!, {}), [...lead, { text: marker }], [{ text: spaces(indentWidth + displayWidth(marker)) }], width));
    } else if (trimmed.startsWith(">")) {
      const quote: Span = { text: `${theme.glyph(G.quote)} `, role: "dim" };
      out.push(...wrapSpans(inline(trimmed.slice(1).trimStart(), { role: "dim", italic: true }), [...lead, quote], [...indent(), quote], width));
    } else if (trimmed.startsWith("|")) {
      // Tables keep their columns; reflowing would scramble them.
      out.push(...wrapColumns(raw, {}, lead, indent(), width));
    } else {
      out.push(...wrapSpans(inline(trimmed, {}), [...lead, ...(pad ? [{ text: pad }] : [])], [{ text: spaces(indentWidth + pad.length) }], width));
    }
  });
  return out;
}

// Message ---------------------------------------------------------------------------------------

const MESSAGE: Record<MessageKind, { glyph: Role | undefined; text: Role | undefined }> = {
  user: { glyph: "accent", text: undefined },
  assistant: { glyph: undefined, text: undefined },
  notice: { glyph: "warning", text: undefined },
  error: { glyph: "error", text: "error" },
};

/** The lines of one message: a gutter glyph, then text under a two-column hanging indent. */
export function messageLines(theme: EjmTheme, kind: MessageKind, text: string, width: number, title?: string): Lines {
  const spec = MESSAGE[kind];
  const gutter: Span[] = [{ text: `${theme.glyph(G.message[kind])} `, role: spec.glyph }];
  if (kind === "assistant") return markdownLines(theme, text, width, gutter);
  const body = clean(title ? `${title}: ${text}` : text);
  const out: Lines = [];
  body.split("\n").forEach((line, i) => {
    out.push(...wrapSpans([{ text: line, role: spec.text }], i === 0 ? gutter : [{ text: spaces(GUTTER) }], [{ text: spaces(GUTTER) }], width));
  });
  return out;
}

// ToolCall --------------------------------------------------------------------------------------

const TOOL: Record<ToolCallState, Role> = {
  queued: "dim",
  running: "accent",
  done: "success",
  failed: "error",
};

export interface ToolCallProps {
  state: ToolCallState;
  name: string;
  detail?: string;
  output?: string;
  expanded?: boolean;
  /** The host's key for showing complete output, such as Ctrl+O. */
  expandKey?: string;
  /** The current spinner frame for a running call. */
  spin?: string;
}

export function toolCallLines(theme: EjmTheme, props: ToolCallProps, width: number): Lines {
  const { state, expanded = false, expandKey } = props;
  const ell = theme.glyph(G.ellipsis);
  const glyph = state === "running" && props.spin ? props.spin : theme.glyph(G.toolCall[state]);
  const head: Span[] = [{ text: clean(props.name), bold: true }];
  if (props.detail) head.push({ text: `  ${clean(props.detail)}`, role: "dim" });
  if (state === "queued") head.push({ text: `  ${T.toolCall.queued}`, role: "dim" });
  if (state === "running") head.push({ text: `  ${T.toolCall.running}${ell}`, role: "accent" });
  const out = wrapSpans(head, [{ text: `${glyph} `, role: TOOL[state] }], [{ text: spaces(GUTTER) }], width);
  if (state === "queued" || state === "running") return out;
  const elbow = theme.glyph(G.elbow);
  const hang = spaces(GUTTER + displayWidth(elbow) + 1);
  const output = clean(props.output ?? "");
  if (!output.trim()) {
    out.push([{ text: truncate(`  ${elbow} ${T.toolCall.empty}`, width, ell), role: "dim" }]);
    return out;
  }
  const failed = state === "failed";
  const body = output.replace(/\n+$/, "").split("\n");
  const limit = expanded ? Infinity : failed ? TOOL_ERROR_LINES : TOOL_PREVIEW_LINES;
  const diff = looksLikeDiff(body);
  const room = Math.max(1, width - hang.length);
  body.slice(0, limit).forEach((line, i) => {
    const lead = i === 0 ? `  ${elbow} ` : hang;
    const role: Role = failed ? "error" : (diff && diffRole(line)) || "dim";
    // Tool output is preformatted: cut long lines instead of reflowing them.
    const cut = [{ text: truncate(lead, width, ell), role: "dim" as Role }, { text: truncate(line, room, ell), role }];
    out.push(cut);
  });
  if (body.length > limit) {
    const more = T.toolCall.more.replace("{count}", String(body.length - limit));
    const key = expandKey ? ` (${T.toolCall.expand.replace("{key}", expandKey)})` : "";
    out.push([{ text: truncate(`${hang}${ell} ${more}${key}`, width, ell), role: "dim" }]);
  }
  return out;
}

// CommandMenu -----------------------------------------------------------------------------------

const MENU: Record<CommandMenuState, true> = { default: true, empty: true };

export interface CommandMenuItem {
  usage: string;
  description: string;
}

export function commandMenuLines(
  theme: EjmTheme,
  props: { items: readonly CommandMenuItem[]; selected?: number; state?: CommandMenuState; message?: string; rows?: number },
  width: number,
): Lines {
  const ell = theme.glyph(G.ellipsis);
  const { items, selected = 0 } = props;
  if (props.state === "empty" || items.length === 0) {
    return [[{ text: truncate(`  ${props.message ?? T.commandMenu.empty}`, width, ell), role: "dim" }]];
  }
  const column = Math.max(8, Math.min(Math.floor(width / 2), Math.max(...items.map((i) => displayWidth(clean(i.usage))))));
  const rows = Math.max(1, props.rows ?? items.length);
  // Scroll so the selection stays visible.
  const start = Math.min(Math.max(0, selected - rows + 1), Math.max(0, items.length - rows));
  return items.slice(start, start + rows).map((item, offset) => {
    const chosen = start + offset === selected;
    const mark = `${chosen ? theme.glyph(G.selected) : " "} `;
    const usage = truncate(clean(item.usage), column, ell);
    const lead = mark + usage + spaces(column - displayWidth(usage)) + "  ";
    const leadFit = truncate(lead, width, ell);
    const line: Span[] = [
      { text: mark, role: "accent", bold: chosen },
      { text: leadFit.slice(mark.length), role: "accent", bold: chosen },
    ];
    const rest = width - displayWidth(leadFit);
    if (rest > 0) line.push({ text: truncate(clean(item.description), rest, ell), role: chosen ? undefined : "dim" });
    return line;
  });
}

// Rendering -------------------------------------------------------------------------------------

function Lines({ lines }: { lines: Lines }) {
  const { theme } = useEjm();
  const bold = theme.level !== "none";
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <InkText key={i} wrap="truncate">
          {line.length === 0 || lineWidth(line) === 0
            ? " "
            : line.map((s, j) => (
                <InkText key={j} color={theme.color(s.role)} bold={s.bold === true && bold} italic={s.italic === true && bold}>
                  {s.text}
                </InkText>
              ))}
        </InkText>
      ))}
    </Box>
  );
}

export function Message({ kind, text, title }: { kind: MessageKind; text: string; title?: string }) {
  const { theme, columns } = useColumns();
  return <Lines lines={messageLines(theme, kind, text, columns, title)} />;
}

export function Markdown({ text, indent = 0 }: { text: string; indent?: number }) {
  const { theme, columns } = useColumns();
  return <Lines lines={markdownLines(theme, text, columns, indent > 0 ? [{ text: spaces(indent) }] : [])} />;
}

export function ToolCall(props: ToolCallProps) {
  const { theme, columns } = useColumns();
  return <Lines lines={toolCallLines(theme, props, columns)} />;
}

export function CommandMenu(props: { items: readonly CommandMenuItem[]; selected?: number; state?: CommandMenuState; message?: string; rows?: number }) {
  const { theme, columns } = useColumns();
  return <Lines lines={commandMenuLines(theme, props, columns)} />;
}

/** States of the conversation blocks, from the tables that drive rendering. */
export const conversationStates = {
  Message: Object.keys(MESSAGE),
  ToolCall: Object.keys(TOOL),
  CommandMenu: Object.keys(MENU),
} as const;
