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

/// A label (`Note`, `Tip`, `Warning`, or an override) over wrapped text, all behind a one-column
/// left rule in the kind's color. There is no box: nothing closes the other three sides.
#[derive(Clone, Copy, Debug)]
pub struct Callout<'a> {
    theme: &'a Theme,
    kind: CalloutKind,
    text: &'a str,
    label: Option<&'a str>,
}

impl<'a> Callout<'a> {
    /// A callout of a kind.
    #[must_use]
    pub fn new(theme: &'a Theme, kind: CalloutKind, text: &'a str) -> Self {
        Self {
            theme,
            kind,
            text,
            label: None,
        }
    }

    /// Replace the kind word. Color still follows [`CalloutKind`].
    #[must_use]
    pub fn label(mut self, label: &'a str) -> Self {
        self.label = Some(label);
        self
    }

    fn parts(&self) -> (&str, Style) {
        let style = match self.kind {
            CalloutKind::Note => self.theme.accent,
            CalloutKind::Tip => self.theme.ok,
            CalloutKind::Warning => self.theme.warn,
        };
        let label = self.label.unwrap_or(match self.kind {
            CalloutKind::Note => "Note",
            CalloutKind::Tip => "Tip",
            CalloutKind::Warning => "Warning",
        });
        (label, style)
    }

    /// The lines for a width, for layouts that need to measure first.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let (label, style) = self.parts();
        let rule = Span::styled(format!("{} ", self.theme.glyphs.quote), style);
        let body = usize::from(w).saturating_sub(2);
        let mut lines = vec![Line::from(vec![
            rule.clone(),
            Span::styled(label.to_owned(), style.add_modifier(Modifier::BOLD)),
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Theme;

    #[test]
    fn label_replaces_the_kind_word() {
        let theme = Theme::no_color();
        let lines = Callout::new(&theme, CalloutKind::Tip, "keep going west")
            .label("Steering")
            .lines(40);
        let text: Vec<String> = lines.iter().map(ToString::to_string).collect();
        assert!(
            text.iter().any(|line| line.contains("Steering")),
            "{text:?}"
        );
        assert!(
            text.iter().any(|line| line.contains("keep going west")),
            "{text:?}"
        );
        assert!(!text.iter().any(|line| line.contains("Tip")), "{text:?}");
    }
}
