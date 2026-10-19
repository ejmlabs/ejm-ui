//! `StateBlock`: an empty, loading or error state with one plain sentence and at most one action.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{fit, put_lines, rows, width, wrap};
use crate::style::Theme;

/// Which state a [`StateBlock`] shows.
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum StateKind {
    /// There is nothing to show yet.
    Empty,
    /// Data is on its way.
    Loading,
    /// Something failed.
    Error,
}

/// The one action of a state, drawn as `[Enter] New session`, or just the label without a key.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Action<'a> {
    key: Option<&'a str>,
    label: &'a str,
}

impl<'a> Action<'a> {
    /// An action with a label only.
    #[must_use]
    pub fn new(label: &'a str) -> Self {
        Self { key: None, label }
    }

    /// Show the key that triggers it, in brackets before the label.
    #[must_use]
    pub fn key(mut self, key: &'a str) -> Self {
        self.key = Some(key);
        self
    }

    pub(crate) fn line(&self, theme: &Theme, indent: usize, w: usize) -> Line<'static> {
        let bold = theme.accent.add_modifier(ratatui::style::Modifier::BOLD);
        let mut parts = vec![(" ".repeat(indent), Style::default())];
        match self.key {
            Some(key) => {
                parts.push((format!("[{key}]"), bold));
                parts.push((format!(" {}", self.label), theme.text));
            }
            None => parts.push((self.label.to_string(), bold)),
        }
        fit(parts, w, theme.glyphs.ellipsis)
    }
}

/// An empty, loading or error state: a glyph and word, one plain sentence, and at most one
/// action. Shown in place of the data it stands for, never as a bare zero or a blank area.
///
/// The glyph and the word (`Empty`, `Loading`, `Error`) are printed together, so the state reads
/// without color. The sentence sits beside them when there is room, and under them when not.
#[derive(Clone, Copy, Debug)]
pub struct StateBlock<'a> {
    theme: &'a Theme,
    kind: StateKind,
    message: &'a str,
    action: Option<Action<'a>>,
}

impl<'a> StateBlock<'a> {
    /// A state with its sentence.
    #[must_use]
    pub fn new(theme: &'a Theme, kind: StateKind, message: &'a str) -> Self {
        Self {
            theme,
            kind,
            message,
            action: None,
        }
    }

    /// Add the one action.
    #[must_use]
    pub fn action(mut self, action: Action<'a>) -> Self {
        self.action = Some(action);
        self
    }

    fn head(&self) -> (String, Style) {
        let t = self.theme;
        match self.kind {
            StateKind::Empty => (format!("{} Empty", t.marks.empty), t.muted),
            StateKind::Loading => (format!("{} Loading", t.glyphs.ellipsis), t.accent),
            StateKind::Error => (format!("{} Error", t.glyphs.fail), t.error),
        }
    }

    /// The lines for a width, for layouts that need to measure first.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let w = usize::from(w);
        let (head, style) = self.head();
        let hw = width(&head) + 2;
        let bold = style.add_modifier(ratatui::style::Modifier::BOLD);
        let (mut lines, indent) = if w >= hw + 12 {
            let body = wrap(self.message, w, &" ".repeat(hw), &" ".repeat(hw));
            let lines = body
                .into_iter()
                .enumerate()
                .map(|(i, l)| {
                    if i == 0 {
                        Line::from(vec![
                            Span::styled(head.clone(), bold),
                            Span::styled(format!("  {}", &l[hw..]), self.theme.text),
                        ])
                    } else {
                        Line::styled(l, self.theme.text)
                    }
                })
                .collect::<Vec<_>>();
            (lines, hw)
        } else {
            let mut lines = vec![Line::styled(
                crate::fit::truncate(&head, w, self.theme.glyphs.ellipsis),
                bold,
            )];
            lines.extend(
                wrap(self.message, w, "  ", "  ")
                    .into_iter()
                    .map(|l| Line::styled(l, self.theme.text)),
            );
            (lines, 2)
        };
        if let Some(action) = &self.action {
            lines.push(action.line(self.theme, indent, w));
        }
        lines
    }

    /// How many rows this needs at `width`.
    #[must_use]
    pub fn height(&self, width: u16) -> u16 {
        rows(&self.lines(width))
    }
}

impl Widget for StateBlock<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}
