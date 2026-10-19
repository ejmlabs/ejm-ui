//! `Row`: one line of a list.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{pad_right, put_lines, truncate, width};
use crate::style::Theme;

const GAP: usize = 2;
pub(crate) const DISABLED: &str = "(disabled)";

/// The state of a [`Row`]. Each is marked by something other than color.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum RowState {
    /// An ordinary row.
    #[default]
    Default,
    /// The chosen row: a `›` mark and strong text.
    Selected,
    /// Not available: muted, and the word `(disabled)` after the label.
    Disabled,
    /// Where the keyboard cursor is: a `▸` mark.
    Focused,
}

/// One line of a list: a label, an optional value and optional meta, after a two-column mark.
/// The label is never cut for the value, and the value is never cut for the meta; the meta is
/// right aligned and dropped first. A disabled row keeps the word `(disabled)` right after its
/// label wherever it fits.
#[derive(Clone, Copy, Debug)]
pub struct Row<'a> {
    theme: &'a Theme,
    label: &'a str,
    value: Option<&'a str>,
    meta: Option<&'a str>,
    state: RowState,
    label_width: Option<usize>,
}

impl<'a> Row<'a> {
    /// A row with its label.
    #[must_use]
    pub fn new(theme: &'a Theme, label: &'a str) -> Self {
        Self {
            theme,
            label,
            value: None,
            meta: None,
            state: RowState::Default,
            label_width: None,
        }
    }

    /// The value, after the label.
    #[must_use]
    pub fn value(mut self, value: &'a str) -> Self {
        self.value = Some(value);
        self
    }

    /// Secondary text at the right edge.
    #[must_use]
    pub fn meta(mut self, meta: &'a str) -> Self {
        self.meta = Some(meta);
        self
    }

    /// Pick the state.
    #[must_use]
    pub fn state(mut self, state: RowState) -> Self {
        self.state = state;
        self
    }

    /// Pad (or cut) the label to this many columns so the values of a list line up.
    #[must_use]
    pub fn label_width(mut self, columns: usize) -> Self {
        self.label_width = Some(columns);
        self
    }

    /// The row as one line of at most `w` columns.
    #[must_use]
    pub fn line(&self, w: u16) -> Line<'static> {
        let t = self.theme;
        let ell = t.glyphs.ellipsis;
        let disabled = self.state == RowState::Disabled;
        let (mark, mark_style, label_style, value_style) = match self.state {
            RowState::Default => (" ", Style::default(), t.text, t.text),
            RowState::Selected => (
                t.glyphs.prompt,
                t.accent.add_modifier(Modifier::BOLD),
                t.strong,
                t.text,
            ),
            RowState::Focused => (t.marks.focused, t.accent, t.text, t.text),
            RowState::Disabled => (" ", Style::default(), t.muted, t.muted),
        };
        let body = usize::from(w).saturating_sub(2);
        let suffix = format!(" {DISABLED}");
        let reserve = if disabled {
            width(&suffix).min(body.saturating_sub(3))
        } else {
            0
        };

        let label = match self.label_width {
            Some(n) => pad_right(&truncate(self.label, n, ell), n),
            None => self.label.to_string(),
        };
        let label = truncate(&label, body - reserve, ell);
        let mut room = body - width(&label);

        let mut spans = vec![
            Span::styled(format!("{mark} "), mark_style),
            Span::styled(label, label_style),
        ];
        if disabled {
            let word = truncate(&suffix, room, ell);
            room -= width(&word);
            spans.push(Span::styled(word, t.muted));
        }
        if let Some(value) = self.value.filter(|v| !v.is_empty()).filter(|_| room > GAP) {
            let value = truncate(value, room - GAP, ell);
            room -= GAP + width(&value);
            spans.push(Span::styled(
                format!("{}{value}", " ".repeat(GAP)),
                value_style,
            ));
        }
        if let Some(meta) = self
            .meta
            .map(|m| crate::fit::clean(m, false))
            .filter(|m| !m.is_empty() && width(m) + GAP <= room)
        {
            spans.push(Span::raw(" ".repeat(room - width(&meta))));
            spans.push(Span::styled(meta, t.muted));
        }
        Line::from(spans)
    }
}

impl Widget for Row<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &[self.line(area.width)]);
    }
}
