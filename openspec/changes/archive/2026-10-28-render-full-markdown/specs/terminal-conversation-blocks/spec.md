# Spec Delta

## ADDED Requirements

### Requirement: Markdown tables keep every word

The Rust `Markdown` block SHALL wrap table cells inside their columns rather than cut them, and SHALL print each row as `Header: value` lines when the columns cannot each hold their longest word.

#### Scenario: A table on a narrow terminal

- **WHEN** an answer contains a three-column table drawn in 20 columns
- **THEN** each body row prints as `Header: value` lines and no cell text is cut

#### Scenario: A long cell

- **WHEN** a cell is wider than its share of the room
- **THEN** it wraps inside its column, and wrapped rows are set apart by a blank row

### Requirement: Markdown reads without its markup

The Rust `Markdown` block SHALL draw strikethrough crossed out, task items with the `ok` and `pending` status glyphs, bullets with the contract `bullet` glyph, and keep line breaks inside a paragraph.

#### Scenario: A task list

- **WHEN** an answer contains `- [x] done` and `- [ ] open`
- **THEN** the lines read `✓ done` and `○ open`

### Requirement: Readable command menu

`CommandMenu` SHALL size its usage column for usages of at most 24 columns, so a longer usage moves only its own description, in every terminal target.

#### Scenario: One long usage

- **WHEN** the menu lists `/remote share [view|control]|status|stop` among short usages
- **THEN** the other rows' descriptions start after the widest short usage
