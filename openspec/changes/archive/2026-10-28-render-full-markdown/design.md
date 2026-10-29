# Design

## Markdown

The renderer on main is kept: its pre-scan for raw patches, reference definitions, syntax-colored fences and `textwrap` placement. `pulldown-cmark` gains strikethrough and task lists. Soft breaks end the line like hard breaks. A task marker replaces the item's bullet before its first line is drawn.

Tables no longer use the `Table` widget, which cuts cells. Each column's natural width is its widest cell, and its floor is its longest word. When the floors and two-column gaps do not fit the room left by the current prefix, rows print stacked as `Header: value`, wrapped with a two-column hanging indent and set apart by a blank row. Otherwise the widest column that is still above its floor gives up a column at a time, which keeps the columns balanced. Cells wrap with the existing styled wrapper, the header is bold, and a hairline as wide as the table follows it. When any body row wraps, body rows are separated by a blank row.

## Glyphs

`bullet` joins the contract glyphs and the hand-kept Rust marks, with the same unicode and ASCII pair, so bullets read the same under `NO_COLOR` and in ASCII.

## Workspace

Regions, top to bottom: header (1), blank (1), transcript, workers, activity (1), notices, rule and draft, blank (1), controls (1). Workers still hide before the draft shrinks. Hosts right-align `ResourceLine` in the activity row and inset the whole screen by one margin.
