import { useEffect, useState, type ReactNode } from "react";
import { Box, Text as InkText, useStdout } from "ink";
import {
  contract,
  fitCell,
  formatNumber,
  displayWidth,
  truncate,
  type CalloutKind,
  type PromptState,
  type RowState,
  type StatState,
  type StatusLevel,
  type StateBlockKind,
  type TableState,
  type TextVariant,
} from "@ejm/core";
import { fitSegs, shrinkParts, type Seg } from "./layout";
import { DEFAULT_COLUMNS, useEjm, type Role } from "./theme";

const G = contract.glyphs;
const T = contract.text;

function useLayout() {
  const { theme, columns } = useEjm();
  const { stdout } = useStdout();
  return { theme, columns: Math.max(1, columns ?? (stdout as NodeJS.WriteStream | undefined)?.columns ?? DEFAULT_COLUMNS) };
}

/** One line of segments, cut to the available width with an ellipsis. */
function Line({ segs }: { segs: Seg[] }) {
  const { theme, columns } = useLayout();
  const fitted = fitSegs(segs, columns, theme.glyph(G.ellipsis));
  return (
    <InkText wrap="truncate">
      {fitted.length === 0 ? " " : fitted.map((s, i) => (
        <InkText key={i} color={theme.color(s.role)} bold={s.bold === true && theme.level !== "none"}>
          {s.text}
        </InkText>
      ))}
    </InkText>
  );
}

/** The spinner glyph while animating, else the still glyph. */
function useSpinner(still: string): string {
  const { theme } = useEjm();
  const frames = theme.unicode ? G.spinner.unicode : G.spinner.ascii;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!theme.animate) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), 80);
    return () => clearInterval(id);
  }, [theme.animate, frames.length]);
  return theme.animate ? frames[i]! : still;
}

// Text ------------------------------------------------------------------------------------------

const TEXT: Record<TextVariant, { role?: Role; bold?: boolean }> = {
  default: {},
  muted: { role: "dim" },
  strong: { bold: true },
  code: { role: "dim" },
};

export function Text({ variant = "default", children }: { variant?: TextVariant; children: ReactNode }) {
  const { theme, columns } = useLayout();
  const v = TEXT[variant];
  return (
    <Box width={columns}>
      <InkText wrap="wrap" color={theme.color(v.role)} bold={v.bold === true && theme.level !== "none"}>
        {children}
      </InkText>
    </Box>
  );
}

// Rule ------------------------------------------------------------------------------------------

export function Rule({ label }: { label?: string }) {
  const { theme, columns } = useLayout();
  const bar = theme.glyph(G.rule);
  const lead = bar.repeat(2);
  const segs: Seg[] = label
    ? [
        { text: lead, role: "dim" },
        { text: ` ${label} `, role: "dim" },
        { text: bar.repeat(Math.max(0, columns - displayWidth(lead) - displayWidth(label) - 2)), role: "dim" },
      ]
    : [{ text: bar.repeat(columns), role: "dim" }];
  return <Line segs={segs} />;
}

// Row -------------------------------------------------------------------------------------------

const ROW: Record<RowState, { marker?: "selected" | "focused"; strong?: boolean; disabled?: boolean }> = {
  default: {},
  selected: { marker: "selected", strong: true },
  focused: { marker: "focused" },
  disabled: { disabled: true },
};

export function Row({ label, value, meta, state = "default" }: { label: string; value?: string; meta?: string; state?: RowState }) {
  const { theme, columns } = useLayout();
  const spec = ROW[state];
  const ell = theme.glyph(G.ellipsis);
  const markerGlyph = spec.marker ? theme.glyph(spec.marker === "selected" ? G.selected : G.focused) : " ";
  const metaText = spec.disabled ? [T.row.disabled, meta].filter(Boolean).join(" ") : (meta ?? "");
  const gap = 2;
  const lw = displayWidth(label);
  const vw = value ? gap + displayWidth(value) : 0;
  const mw = metaText ? gap + displayWidth(metaText) : 0;
  const excess = 2 + lw + vw + mw - columns;
  // Take columns from meta first, then value, then the label.
  const [mPart, vPart, lPart] = shrinkParts(
    [
      { width: mw, min: 0 },
      { width: vw, min: vw ? gap + Math.min(vw - gap, 3) : 0 },
      { width: lw, min: Math.min(lw, 6) },
    ],
    excess,
  );
  const segs: Seg[] = [
    { text: markerGlyph + " ", role: spec.marker ? "accent" : undefined, bold: spec.marker === "selected" },
    { text: truncate(label, lPart!, ell), role: spec.disabled ? "dim" : undefined, bold: spec.strong },
  ];
  if (value && vPart! > gap) segs.push({ text: "  " + truncate(value, vPart! - gap, ell) });
  if (metaText && mPart! > gap + 1) segs.push({ text: "  " + truncate(metaText, mPart! - gap, ell), role: "dim" });
  return <Line segs={segs} />;
}

// Status ----------------------------------------------------------------------------------------

const STATUS: Record<StatusLevel, { role: Role }> = {
  ok: { role: "success" },
  warn: { role: "warning" },
  error: { role: "error" },
  info: { role: "info" },
  pending: { role: "dim" },
};

export function Status({ status, label }: { status: StatusLevel; label?: string }) {
  const { theme } = useLayout();
  const g = G.status[status];
  const segs: Seg[] = [
    { text: `${theme.glyph(g)} `, role: STATUS[status].role },
    { text: g.label, role: STATUS[status].role, bold: true },
  ];
  if (label) segs.push({ text: `  ${label}` });
  return <Line segs={segs} />;
}

// Stat ------------------------------------------------------------------------------------------

const STAT: Record<StatState, { role?: Role }> = {
  default: {},
  loading: { role: "accent" },
  error: { role: "error" },
  empty: { role: "dim" },
};

export function Stat({ figure, label, state = "default" }: { figure?: string; label: string; state?: StatState }) {
  const { theme } = useLayout();
  const ell = theme.glyph(G.ellipsis);
  const text =
    state === "loading" ? `${T.stat.loading}${ell}`
    : state === "error" ? `${theme.glyph(G.status.error)} ${T.stat.error}`
    : state === "empty" ? T.stat.empty
    : (figure ?? "");
  return <Line segs={[{ text, role: STAT[state].role, bold: state === "default" }, { text: `  ${label}`, role: "dim" }]} />;
}

// StateBlock ------------------------------------------------------------------------------------

const BLOCK: Record<StateBlockKind, { role: Role }> = {
  empty: { role: "dim" },
  loading: { role: "accent" },
  error: { role: "error" },
};

export function StateBlock({ kind, message, action }: { kind: StateBlockKind; message: string; action?: { key?: string; label: string } }) {
  const { theme, columns } = useLayout();
  const g = G.stateBlock[kind];
  const spin = useSpinner(theme.glyph(g));
  const role = BLOCK[kind].role;
  return (
    <Box flexDirection="column">
      <Line segs={[{ text: `${kind === "loading" ? spin : theme.glyph(g)} `, role }, { text: g.label, role, bold: true }]} />
      <Box paddingLeft={2} width={columns}>
        <InkText wrap="wrap">{message}</InkText>
      </Box>
      {action ? <Line segs={[{ text: `  ${action.key ? `[${action.key}] ` : ""}${action.label}`, role: "accent" }]} /> : null}
    </Box>
  );
}

// Table -----------------------------------------------------------------------------------------

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: number;
}
type Cell = string | number;

const TABLE: Record<TableState, { block?: StateBlockKind }> = {
  default: {},
  empty: { block: "empty" },
  loading: { block: "loading" },
  error: { block: "error" },
};

const decimalsOf = (n: number) => Math.min(3, (String(n).split(".")[1] ?? "").length);

export function Table({ columns, rows, state = "default", message }: { columns: TableColumn[]; rows: Record<string, Cell>[]; state?: TableState; message?: string }) {
  const { theme, columns: cols } = useLayout();
  const ell = theme.glyph(G.ellipsis);
  const gap = 2;
  const minW = 3;

  // Drop trailing columns that cannot fit even at the minimum width.
  let shown = columns;
  while (shown.length > 1 && shown.length * minW + gap * (shown.length - 1) > cols) shown = shown.slice(0, -1);

  const cells = shown.map((c) => {
    const values = rows.map((r) => r[c.key]);
    const numeric = values.length > 0 && values.every((v) => typeof v === "number");
    const decimals = numeric ? Math.max(...values.map((v) => decimalsOf(v as number))) : 0;
    const text = values.map((v) => (typeof v === "number" ? formatNumber(v, decimals) : String(v ?? "")));
    return { align: c.align ?? (numeric ? "right" : "left"), text, c };
  });
  const widths = cells.map(({ c, text }) => c.width ?? Math.max(displayWidth(c.label), ...text.map(displayWidth)));
  // Shrink the widest column one step at a time until the table fits.
  const total = () => widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  while (total() > cols) {
    let widest = 0;
    widths.forEach((w, i) => { if (w > widths[widest]!) widest = i; });
    if (widths[widest]! <= minW) break;
    widths[widest]!--;
  }
  const join = (parts: string[]) => parts.join(" ".repeat(gap));
  const header = join(cells.map(({ c, align }, i) => fitCell(c.label, widths[i]!, align, ell)));
  const body = rows.map((_, r) => join(cells.map(({ text, align }, i) => fitCell(text[r]!, widths[i]!, align, ell))));
  const kind = TABLE[state].block;
  const ruleW = Math.min(total(), cols);
  return (
    <Box flexDirection="column">
      <Line segs={[{ text: header, role: "dim", bold: true }]} />
      <Line segs={[{ text: theme.glyph(G.rule).repeat(ruleW), role: "dim" }]} />
      {kind ? <StateBlock kind={kind} message={message ?? T.table[kind]} /> : body.map((line, i) => <Line key={i} segs={[{ text: line }]} />)}
    </Box>
  );
}

// Prompt ----------------------------------------------------------------------------------------

const PROMPT: Record<PromptState, { showCursor: boolean }> = {
  idle: { showCursor: true },
  busy: { showCursor: false },
  error: { showCursor: true },
};

export function Prompt({ value, placeholder, state = "idle", message }: { value: string; placeholder?: string; state?: PromptState; message?: string }) {
  const { theme } = useLayout();
  const spin = useSpinner(theme.glyph(G.ellipsis));
  const segs: Seg[] = [{ text: `${theme.glyph(G.prompt)} `, role: "accent", bold: true }, { text: value }];
  if (PROMPT[state].showCursor) segs.push({ text: theme.glyph(G.cursor), role: "accent" });
  if (!value && placeholder) segs.push({ text: placeholder, role: "dim" });
  if (state === "busy") segs.push({ text: `  ${spin} ${T.prompt.busy}`, role: "accent" });
  return (
    <Box flexDirection="column">
      <Line segs={segs} />
      {state === "error" ? <Line segs={[{ text: `${theme.glyph(G.status.error)} ${message ?? "That did not work. Try again."}`, role: "error" }]} /> : null}
    </Box>
  );
}

// KeyHints --------------------------------------------------------------------------------------

export function KeyHints({ hints }: { hints: { key: string; label: string }[] }) {
  const { theme, columns } = useLayout();
  const sep = ` ${theme.glyph(G.separator)} `;
  const segs: Seg[] = [];
  let used = 0;
  hints.forEach((h, i) => {
    const pair: Seg[] = [{ text: h.key, bold: true }, { text: ` ${h.label}`, role: "dim" }];
    const w = displayWidth(h.key) + 1 + displayWidth(h.label) + (i ? displayWidth(sep) : 0);
    if (used + w > columns) return; // pairs that do not fit are dropped from the end
    if (i) segs.push({ text: sep, role: "dim" });
    segs.push(...pair);
    used += w;
  });
  return <Line segs={segs} />;
}

// Callout ---------------------------------------------------------------------------------------

const CALLOUT: Record<CalloutKind, { role: Role }> = {
  note: { role: "accent" },
  tip: { role: "success" },
  warning: { role: "warning" },
};

export function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }) {
  const { theme, columns } = useLayout();
  const { role } = CALLOUT[kind];
  const left = theme.glyph(G.quote);
  return (
    <Box
      width={columns}
      paddingLeft={1}
      borderStyle={{ topLeft: "", top: "", topRight: "", left, bottomLeft: "", bottom: "", bottomRight: "", right: "" }}
      borderTop={false}
      borderBottom={false}
      borderRight={false}
      borderColor={theme.color(role)}
    >
      <InkText wrap="wrap">
        <InkText color={theme.color(role)} bold={theme.level !== "none"}>{G.callout[kind].label}</InkText>
        {" "}
        {children}
      </InkText>
    </Box>
  );
}

/** Each component's states, taken from the tables that drive rendering so the catalog cannot drift from the code. */
export const componentStates = {
  Text: ["default"],
  Rule: ["default"],
  Row: Object.keys(ROW),
  Status: Object.keys(STATUS),
  Stat: Object.keys(STAT),
  Table: Object.keys(TABLE),
  Prompt: Object.keys(PROMPT),
  KeyHints: ["default"],
  Callout: Object.keys(CALLOUT),
  StateBlock: Object.keys(BLOCK),
} as const satisfies Record<keyof typeof contract.components, readonly string[]>;
