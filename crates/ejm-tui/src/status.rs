//! `Status`: a glyph and a word together.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{fit, put_lines};
use crate::style::Theme;

/// The level of a [`Status`]. The word printed next to the glyph is the lowercase level name.
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum StatusLevel {
    /// Done or healthy.
    Ok,
    /// Needs attention.
    Warn,
    /// Failed.
    Error,
    /// For information.
    Info,
    /// Not started or not known yet.
    Pending,
}

/// A status as `✓ ok`: glyph and word in one color, so it reads under `NO_COLOR`. A custom label
/// replaces the word but keeps the glyph.
#[derive(Clone, Copy, Debug)]
pub struct Status<'a> {
    theme: &'a Theme,
    level: StatusLevel,
    label: Option<&'a str>,
}

impl<'a> Status<'a> {
    /// A status with the default word for its level.
    #[must_use]
    pub fn new(theme: &'a Theme, level: StatusLevel) -> Self {
        Self {
            theme,
            level,
            label: None,
        }
    }

    /// Replace the word, for example `deployed`.
    #[must_use]
    pub fn label(mut self, label: &'a str) -> Self {
        self.label = Some(label);
        self
    }

    fn parts(&self) -> (&'static str, Style) {
        let t = self.theme;
        match self.level {
            StatusLevel::Ok => (t.glyphs.ok, t.ok),
            StatusLevel::Warn => (t.glyphs.warn, t.warn),
            StatusLevel::Error => (t.glyphs.fail, t.error),
            StatusLevel::Info => (t.marks.info, t.info),
            StatusLevel::Pending => (t.glyphs.idle, t.pending),
        }
    }
}

impl Widget for Status<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let (glyph, style) = self.parts();
        let word: &str = self.label.unwrap_or_else(|| self.level.into());
        let text = format!("{glyph} {}", crate::fit::clean(word, false));
        put_lines(
            buf,
            area,
            &[fit(
                vec![(text, style)],
                usize::from(area.width),
                self.theme.glyphs.ellipsis,
            )],
        );
    }
}
