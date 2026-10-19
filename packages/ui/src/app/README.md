# Application kit

A dashboard, three chart types and the empty, loading and error states for every list, table and chart. No boxes: figures, hairlines and space. Import from `@ejm/ui`. Colors come only from `packages/ui/THEME.md`.

| Component | Props | Use it for | Accessibility |
| --- | --- | --- | --- |
| `Dashboard` | `title`; `period`; `sample`; `stats` (`label`, `figure`, `delta`, `state`); `chart` (chart props and `kind` line, area or bar); `table`; `activity`; `state` default, loading, error or empty; `as` h2 or h3 | An overview: a row of figures, a chart, a hairline table and an activity feed. It reflows by its own width: one column on a phone, two columns with a full-width chart from 48rem, and one editorial row of chart, table and activity from 80rem. | Pass `sample` for any demo: it prints "Sample data" above the title. Loading speaks once (one polite status) and holds the placeholders inert. Error and empty are one sentence and one action. A part can fail alone through its own `state`. |
| `ChartLine`, `ChartArea` | `title`; `description`; `categories`; `series` (1 to 6: `label`, `short`, `values`); `categoryLabel`; `unit`; `format`; `as`; `state`; `message`; `action`; `onAction` | Trends over an ordered axis. Area is the line chart with a light tint under each line. | An svg with `role="img"` and a name that lists the series. Series differ by hue, marker shape and dash pattern, and the end of each line carries its name. A text `Legend` and a native "View as table" disclosure with every value are real elements in the server HTML. |
| `ChartBar` | the same | Grouped bars across categories. | Each series has its own fill pattern (solid, stripes, dots, lines, hatch). Value labels show where they fit; the table has all of them. |
| `Legend` | `items`; `kind`; `patternId` | The text legend under a chart. Used by the charts; use it alone only to match a custom drawing. | A `ul` named "Legend". Every series is named in words next to a swatch of its marker and dash or pattern. |
| `ChartFrame` | `kind`; `draw` plus the chart props | The shared body of the charts: heading, drawing, legend, table and states. Build a new chart type on it. | See the charts. |
| `ActivityList` | `items` (`id`, `title`, `detail`, `at`, `status`); `now`; `label`; `state`; `message`; `action`; `onAction` | A feed of hairline rows: what happened, when (relative) and a status glyph with its word. | `time` elements keep the exact moment. Pass `now` so the server and the browser print the same "5m ago". |

## Data rules

- Series colors are `hue-1` to `hue-6`, in order. They pass 3:1 on Paper, Mist and Ink in both themes and are not defined on Sage, so charts do not sit on Sage.
- Values start at zero (counts, durations, sizes). A gap in the data (`NaN`) is a gap in the line. More than six series are not drawn.
- The drawing is 1 SVG unit per CSS pixel: the chart measures its own box (ResizeObserver) and re-lays out, so axis text stays at its real size. Narrow charts thin their x labels and shorten the end labels. Before the script runs the chart draws at 640 by 256 and scales to fit.
- Motion: the data layer fades in once (`animate-fade`, opacity only). Under reduced motion, or without scripts, it is simply there.

## States

Each part takes `state` default, empty, loading or error, plus `message` (one sentence) and `action` with `onAction` (one action). A chart or list with no data shows its empty state on its own. The default sentences are in `appWords`. Skeletons have the same height as the real thing, and only fade (opacity), which holds still under reduced motion. Error is `role="alert"`, loading is `role="status"`.
