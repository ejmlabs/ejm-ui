//! `Text` and `Rule`: the two plainest primitives.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::Line;
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{fit, put_lines, rows, truncate, wrap};
use crate::style::Theme;

/// The emphasis of a [`Text`]. In a terminal every glyph is monospace already, so `Code` is the
/// quietest color rather than a different font. Under `NO_COLOR` only `Strong` differs (bold).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum TextVariant {
    /// Body text in the terminal's own color.
    #[default]
    Default,
    /// Secondary text.
    Muted,
    /// Bold.
    Strong,
    /// Code and identifiers.
    Code,
}

/// A run of text, wrapped to the area width. A newline starts a new line.
#[derive(Clone, Copy, Debug)]
pub struct Text<'a> {
    theme: &'a Theme,
    body: &'a str,
    variant: TextVariant,
}

impl<'a> Text<'a> {
    /// Body text.
    #[must_use]
    pub fn new(theme: &'a Theme, text: &'a str) -> Self {
        Self {
            theme,
            body: text,
            variant: TextVariant::Default,
        }
    }

    /// Pick the emphasis.
    #[must_use]
    pub fn variant(mut self, variant: TextVariant) -> Self {
        self.variant = variant;
        self
    }

    fn style(&self) -> Style {
        match self.variant {
            TextVariant::Default => self.theme.text,
            TextVariant::Muted => self.theme.muted,
            TextVariant::Strong => self.theme.strong,
            TextVariant::Code => self.theme.code,
        }
    }

    /// The wrapped lines for a width, for layouts that need to measure first.
    #[must_use]
    pub fn lines(&self, width: u16) -> Vec<Line<'static>> {
        let style = self.style();
        self.body
            .split('\n')
            .flat_map(|para| wrap(para, usize::from(width), "", ""))
            .map(|l| Line::styled(l, style))
            .collect()
    }

    /// How many rows this needs at `width`.
    #[must_use]
    pub fn height(&self, width: u16) -> u16 {
        rows(&self.lines(width))
    }
}

impl Widget for Text<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}

/// A single hairline that separates groups, optionally led by a muted label. It is never the
/// edge of a box: nothing joins to it.
#[derive(Clone, Copy, Debug)]
pub struct Rule<'a> {
    theme: &'a Theme,
    label: Option<&'a str>,
}

impl<'a> Rule<'a> {
    /// A rule across the full width.
    #[must_use]
    pub fn new(theme: &'a Theme) -> Self {
        Self { theme, label: None }
    }

    /// Lead the rule with a label: `Sessions ────────`.
    #[must_use]
    pub fn label(mut self, label: &'a str) -> Self {
        self.label = Some(label);
        self
    }

    /// The rule as one line of exactly `width` columns.
    #[must_use]
    pub fn line(&self, width: u16) -> Line<'static> {
        let w = usize::from(width);
        let mark = self.theme.marks.rule;
        match self.label {
            Some(label) => {
                let head = truncate(label, w.saturating_sub(2), self.theme.glyphs.ellipsis);
                let used = crate::fit::width(&head) + 1;
                fit(
                    vec![
                        (format!("{head} "), self.theme.muted),
                        (mark.repeat(w.saturating_sub(used)), self.theme.rule),
                    ],
                    w,
                    self.theme.glyphs.ellipsis,
                )
            }
            None => Line::styled(mark.repeat(w), self.theme.rule),
        }
    }
}

impl Widget for Rule<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &[self.line(area.width)]);
    }
}
