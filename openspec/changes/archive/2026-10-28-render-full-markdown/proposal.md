# Proposal

## Why

The Rust `Markdown` block on main parses with `pulldown-cmark` but leaves gaps that show in every assistant answer. A narrow table cuts its cells and drops columns, so words disappear. `~~strikethrough~~` and task boxes print their markup. Line breaks inside a paragraph are joined, which runs a model's short lines together. Bullets are a plain `-`.

The ejm-cli screen also needs workspace recipes that are quieter: one header line, counts only while work is active, a blank row before the footer, and footer keys at the right edge.

## What Changes

- Tables wrap long cells inside their columns, separate wrapped rows with a blank row, honor center alignment, and print each row as `Header: value` lines when the columns cannot each hold their longest word. Nothing is cut.
- Strikethrough is crossed out. Task items use the status glyphs, `✓` done and `○` open. Line breaks inside a paragraph are kept, as in GitHub comments. Bullets use a new contract `bullet` glyph, `•` or ASCII `-`; Ink's lighter Markdown uses it too.
- `SessionHeader` draws one line from its first column. `WorkspaceLayout` adds a blank row after the header and before the controls and drops the resource row. `ResourceLine` draws nothing while idle. `workspace_controls` puts the hints at the right edge. `Status` gains `line`.
- `CommandMenu` sizes its column for usages of at most 24 columns, so one long usage moves only its own description, in Rust and Ink.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `terminal-conversation-blocks`: Markdown tables, tasks, strikethrough and line breaks; the command menu column.

## Impact

Changes `crates/ejm-tui` (`markdown`, `workspace`, `status`, `style`, `conversation`), the contract and its TypeScript types, and the Ink command menu and bullet. `Markdown` stays registered for Rust only. `WorkspaceLayout::resources` and `SessionHeader::lines` are removed; ejm-cli is their only user and adopts the new forms in its own change.
