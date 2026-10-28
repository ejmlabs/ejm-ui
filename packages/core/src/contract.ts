import contractJson from "../contract.json";

export type Target = "web" | "ink" | "rust";

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  /** The allowed values when the prop is an enum. */
  values?: string[];
}

export interface ComponentSpec {
  summary: string;
  props: PropSpec[];
  states: string[];
  targets: Target[];
}

export interface GlyphPair {
  unicode: string;
  ascii: string;
}

export interface Contract {
  version: number;
  about: string;
  principles: string[];
  targets: Target[];
  /** Repo-relative path of each target's catalog.json. */
  catalogs: Record<Target, string>;
  glyphs: {
    status: Record<StatusLevel, GlyphPair & { label: string }>;
    callout: Record<CalloutKind, { label: string }>;
    stateBlock: Record<StateBlockKind, GlyphPair & { label: string }>;
    rule: GlyphPair;
    ellipsis: GlyphPair;
    cursor: GlyphPair;
    prompt: GlyphPair;
    selected: GlyphPair;
    focused: GlyphPair;
    quote: GlyphPair;
    separator: GlyphPair;
    spinner: { unicode: string[]; ascii: string[] };
    message: { about: string } & Record<MessageKind, GlyphPair & { label: string }>;
    toolCall: { about: string } & Record<ToolCallState, GlyphPair & { label: string }>;
    elbow: GlyphPair;
  };
  /** Default words used when the caller gives no message. */
  text: {
    row: { disabled: string };
    stat: { loading: string; error: string; empty: string };
    table: { empty: string; loading: string; error: string };
    prompt: { busy: string };
    toolCall: { queued: string; running: string; empty: string; more: string; expand: string };
    commandMenu: { empty: string };
  };
  components: Record<ComponentName, ComponentSpec>;
}

export type TextVariant = "default" | "muted" | "strong" | "code";
export type RowState = "default" | "selected" | "disabled" | "focused";
export type StatusLevel = "ok" | "warn" | "error" | "info" | "pending";
export type StatState = "default" | "loading" | "error" | "empty";
export type TableState = "default" | "empty" | "loading" | "error";
export type PromptState = "idle" | "busy" | "error";
export type CalloutKind = "note" | "tip" | "warning";
export type StateBlockKind = "empty" | "loading" | "error";
export type MessageKind = "user" | "assistant" | "notice" | "error";
export type ToolCallState = "queued" | "running" | "done" | "failed";
export type CommandMenuState = "default" | "empty";

export type ComponentName =
  | "Text"
  | "Rule"
  | "Row"
  | "Status"
  | "Stat"
  | "Table"
  | "Prompt"
  | "KeyHints"
  | "Callout"
  | "Markdown"
  | "StateBlock"
  | "Message"
  | "ToolCall"
  | "CommandMenu";

export const contract = contractJson as Contract;

/** The catalog shape every target publishes: component name to the states it implements. */
export type Catalog = Record<string, string[]>;
