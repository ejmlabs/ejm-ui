//! `Stat`: a figure with its label.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::Line;
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{put_lines, truncate};
use crate::style::Theme;

/// The state of a [`Stat`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum StatState {
    /// The figure is shown.
    #[default]
    Default,
    /// The figure is on its way: a placeholder word.
    Loading,
    /// The figure could not be fetched: a plain sentence.
    Error,
    /// There is no figure yet: a plain sentence, never a zero.
    Empty,
}

/// A figure over its label, two rows high. Loading, error and empty show a glyph and a word (or
/// your sentence) in place of the figure. A stat never shows a zero for missing data.
#[derive(Clone, Copy, Debug)]
pub struct Stat<'a> {
    theme: &'a Theme,
    label: &'a str,
    figure: Option<&'a str>,
    state: StatState,
    message: Option<&'a str>,
}

impl<'a> Stat<'a> {
    /// A stat with its label. Add the figure with [`Stat::figure`].
    #[must_use]
    pub fn new(theme: &'a Theme, label: &'a str) -> Self {
        Self {
            theme,
            label,
            figure: None,
            state: StatState::Default,
            message: None,
        }
    }

    /// The figure, already formatted, for example `2.3M`.
    #[must_use]
    pub fn figure(mut self, figure: &'a str) -> Self {
        self.figure = Some(figure);
        self
    }

    /// Pick the state.
    #[must_use]
    pub fn state(mut self, state: StatState) -> Self {
        self.state = state;
        self
    }

    /// Replace the default word (`Loading`, `Failed`, `No data`) with a plain sentence.
    #[must_use]
    pub fn message(mut self, message: &'a str) -> Self {
        self.message = Some(message);
        self
    }

    /// Rows this needs.
    pub const HEIGHT: u16 = 2;

    fn lines(&self, w: usize) -> [Line<'static>; 2] {
        let t = self.theme;
        let (text, style): (String, Style) = match self.state {
            StatState::Default => match self.figure.filter(|f| !f.is_empty()) {
                Some(figure) => (figure.to_string(), t.strong),
                None => (t.marks.empty.to_string(), t.muted),
            },
            StatState::Loading => (
                format!(
                    "{} {}",
                    t.glyphs.ellipsis,
                    self.message.unwrap_or("Loading")
                ),
                t.accent,
            ),
            StatState::Error => (
                format!("{} {}", t.glyphs.fail, self.message.unwrap_or("Failed")),
                t.error,
            ),
            StatState::Empty => (
                format!("{} {}", t.marks.empty, self.message.unwrap_or("No data")),
                t.muted,
            ),
        };
        [
            Line::styled(truncate(&text, w, t.glyphs.ellipsis), style),
            Line::styled(truncate(self.label, w, t.glyphs.ellipsis), t.muted),
        ]
    }
}

impl Widget for Stat<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(usize::from(area.width)));
    }
}
