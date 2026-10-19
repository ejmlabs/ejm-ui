//! `Table`: a header, a hairline and rows.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::Line;
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{pad_left, pad_right, put_lines, rows, truncate, width};
use crate::state::{Action, StateBlock, StateKind};
use crate::style::Theme;
use crate::text::Rule;

const GAP: usize = 2;
const MIN_COL: usize = 3;

/// How a column's cells sit in it. Use `Right` for numbers so the digits line up.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Align {
    /// Flush left.
    #[default]
    Left,
    /// Flush right.
    Right,
}

/// A table column: a header label, an alignment and optionally a fixed width.
#[derive(Clone, Copy, Debug)]
pub struct Column<'a> {
    label: &'a str,
    align: Align,
    width: Option<u16>,
}

impl<'a> Column<'a> {
    /// A left aligned column that is as wide as its widest cell.
    #[must_use]
    pub fn new(label: &'a str) -> Self {
        Self {
            label,
            align: Align::Left,
            width: None,
        }
    }

    /// Right align the cells. Use for numbers.
    #[must_use]
    pub fn right(mut self) -> Self {
        self.align = Align::Right;
        self
    }

    /// Fix the width in columns. Cells longer than this are cut with an ellipsis.
    #[must_use]
    pub fn width(mut self, columns: u16) -> Self {
        self.width = Some(columns);
        self
    }
}

/// The state of a [`Table`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum TableState {
    /// The rows are shown.
    #[default]
    Default,
    /// No rows: the header stays and a [`StateBlock`] explains.
    Empty,
    /// Rows are on their way.
    Loading,
    /// Rows could not be fetched.
    Error,
}

/// Columns and rows under a header and one hairline. Column widths come from the content; when
/// the area is narrower, text columns shrink first (never below three columns, with an
/// ellipsis), then number columns, then trailing columns are dropped, so a row never wraps and
/// never spills past the area. Rows beyond the area height are not drawn.
///
/// The empty, loading and error states keep the header and replace the rows with a
/// [`StateBlock`], so the table does not change shape when its data arrives.
#[derive(Clone, Debug)]
pub struct Table<'a> {
    theme: &'a Theme,
    columns: &'a [Column<'a>],
    rows: Vec<Vec<&'a str>>,
    state: TableState,
    message: Option<&'a str>,
    action: Option<Action<'a>>,
}

impl<'a> Table<'a> {
    /// A table with its columns.
    #[must_use]
    pub fn new(theme: &'a Theme, columns: &'a [Column<'a>]) -> Self {
        Self {
            theme,
            columns,
            rows: Vec::new(),
            state: TableState::Default,
            message: None,
            action: None,
        }
    }

    /// The rows, one list of cells per row, in column order. Missing cells are blank.
    #[must_use]
    pub fn rows<R, S>(mut self, rows: &'a [R]) -> Self
    where
        R: AsRef<[S]>,
        S: AsRef<str> + 'a,
    {
        self.rows = rows
            .iter()
            .map(|r| r.as_ref().iter().map(AsRef::as_ref).collect())
            .collect();
        self
    }

    /// Pick the state.
    #[must_use]
    pub fn state(mut self, state: TableState) -> Self {
        self.state = state;
        self
    }

    /// The sentence of the empty, loading and error states.
    #[must_use]
    pub fn message(mut self, message: &'a str) -> Self {
        self.message = Some(message);
        self
    }

    /// The one action of the empty and error states.
    #[must_use]
    pub fn action(mut self, action: Action<'a>) -> Self {
        self.action = Some(action);
        self
    }

    /// The column widths for `avail` columns, after shrinking and dropping.
    fn widths(&self, avail: usize) -> Vec<usize> {
        let mut widths: Vec<usize> = self
            .columns
            .iter()
            .enumerate()
            .map(|(i, c)| {
                c.width.map_or_else(
                    || {
                        self.rows
                            .iter()
                            .filter_map(|r| r.get(i))
                            .map(|s| width(&crate::fit::clean(s, false)))
                            .fold(width(c.label), usize::max)
                    },
                    usize::from,
                )
            })
            .collect();
        let total = |w: &[usize]| w.iter().sum::<usize>() + GAP * w.len().saturating_sub(1);
        // Shrink text columns, then number columns, then fixed ones, widest first.
        let classes: [&dyn Fn(usize) -> bool; 3] = [
            &|i| self.columns[i].width.is_none() && self.columns[i].align == Align::Left,
            &|i| self.columns[i].width.is_none(),
            &|_| true,
        ];
        for class in classes {
            while total(&widths) > avail {
                let widest = (0..widths.len())
                    .filter(|&i| class(i) && widths[i] > MIN_COL)
                    .max_by_key(|&i| widths[i]);
                match widest {
                    Some(i) => widths[i] -= 1,
                    None => break,
                }
            }
        }
        while total(&widths) > avail && widths.len() > 1 {
            widths.pop();
        }
        widths
    }

    fn line<'c>(
        &self,
        cells: impl Iterator<Item = &'c str>,
        widths: &[usize],
        style: ratatui::style::Style,
    ) -> Line<'static> {
        let ell = self.theme.glyphs.ellipsis;
        let mut cells = cells;
        let out: Vec<String> = widths
            .iter()
            .zip(self.columns)
            .map(|(&w, col)| {
                let cell = truncate(cells.next().unwrap_or(""), w, ell);
                if col.align == Align::Right {
                    pad_left(&cell, w)
                } else {
                    pad_right(&cell, w)
                }
            })
            .collect();
        Line::styled(out.join(&" ".repeat(GAP)), style)
    }

    fn state_block(&self) -> Option<StateBlock<'a>> {
        let (kind, fallback) = match self.state {
            TableState::Default => return None,
            TableState::Empty => (StateKind::Empty, "Nothing to show yet."),
            TableState::Loading => (StateKind::Loading, "Loading the table."),
            TableState::Error => (StateKind::Error, "Could not load the table."),
        };
        let block = StateBlock::new(self.theme, kind, self.message.unwrap_or(fallback));
        Some(
            match self.action.filter(|_| self.state != TableState::Loading) {
                Some(action) => block.action(action),
                None => block,
            },
        )
    }

    /// The lines for a width: header, hairline, then rows or the state.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let widths = self.widths(usize::from(w));
        let table_w =
            u16::try_from(widths.iter().sum::<usize>() + GAP * widths.len().saturating_sub(1))
                .unwrap_or(w);
        let mut lines = vec![
            self.line(
                self.columns.iter().map(|c| c.label),
                &widths,
                self.theme.muted,
            ),
            Rule::new(self.theme).line(table_w),
        ];
        match self.state_block() {
            Some(block) => lines.extend(block.lines(w)),
            None => lines.extend(
                self.rows
                    .iter()
                    .map(|r| self.line(r.iter().copied(), &widths, self.theme.text)),
            ),
        }
        lines
    }

    /// How many rows this needs at `width`.
    #[must_use]
    pub fn height(&self, width: u16) -> u16 {
        rows(&self.lines(width))
    }
}

impl Widget for Table<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}
