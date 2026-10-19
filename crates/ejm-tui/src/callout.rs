//! `Callout`: a note, tip or warning set off by a left rule.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{put_lines, rows, wrap};
use crate::style::Theme;

/// The kind of a [`Callout`].
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum CalloutKind {
    /// Something worth knowing.
    Note,
    /// A suggestion.
    Tip,
    /// Something that can go wrong.
    Warning,
}

/// A label (`Note`, `Tip`, `Warning`) over wrapped text, all behind a one-column left rule in the
/// kind's color. There is no box: nothing closes the other three sides.
#[derive(Clone, Copy, Debug)]
pub struct Callout<'a> {
    theme: &'a Theme,
    kind: CalloutKind,
    text: &'a str,
}

impl<'a> Callout<'a> {
    /// A callout of a kind.
    #[must_use]
    pub fn new(theme: &'a Theme, kind: CalloutKind, text: &'a str) -> Self {
        Self { theme, kind, text }
    }

    fn parts(&self) -> (&'static str, Style) {
        match self.kind {
            CalloutKind::Note => ("Note", self.theme.accent),
            CalloutKind::Tip => ("Tip", self.theme.ok),
            CalloutKind::Warning => ("Warning", self.theme.warn),
        }
    }

    /// The lines for a width, for layouts that need to measure first.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let (label, style) = self.parts();
        let rule = Span::styled(format!("{} ", self.theme.glyphs.quote), style);
        let body = usize::from(w).saturating_sub(2);
        let mut lines = vec![Line::from(vec![
            rule.clone(),
            Span::styled(label, style.add_modifier(Modifier::BOLD)),
        ])];
        for para in self.text.split('\n') {
            for l in wrap(para, body, "", "") {
                lines.push(Line::from(vec![
                    rule.clone(),
                    Span::styled(l, self.theme.text),
                ]));
            }
        }
        lines
    }

    /// How many rows this needs at `width`.
    #[must_use]
    pub fn height(&self, width: u16) -> u16 {
        rows(&self.lines(width))
    }
}

impl Widget for Callout<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}
