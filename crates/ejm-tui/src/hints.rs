//! `KeyHints`: key and label pairs on one line.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;

use crate::fit::{clean, put_lines, take_cols, truncate, width};
use crate::style::Theme;

/// Key and label pairs joined by the separator glyph: `Enter send · Ctrl+C quit`. Keys are bold
/// and labels muted. Pairs that do not fit are dropped from the end, so list the most important
/// pair first. If even the first pair is too wide it is cut with an ellipsis.
#[derive(Clone, Copy, Debug)]
pub struct KeyHints<'a> {
    theme: &'a Theme,
    hints: &'a [(&'a str, &'a str)],
}

impl<'a> KeyHints<'a> {
    /// Hints as `(key, label)` pairs, most important first.
    #[must_use]
    pub fn new(theme: &'a Theme, hints: &'a [(&'a str, &'a str)]) -> Self {
        Self { theme, hints }
    }

    /// The hints as one line of at most `w` columns.
    #[must_use]
    pub fn line(&self, w: u16) -> Line<'static> {
        let w = usize::from(w);
        let t = self.theme;
        let sep = format!(" {} ", t.glyphs.separator);
        let mut spans: Vec<Span<'static>> = Vec::new();
        let mut used = 0;
        for (i, (key, label)) in self.hints.iter().enumerate() {
            let (key, label) = (clean(key, false), clean(label, false));
            let lead = if i == 0 { 0 } else { width(&sep) };
            let need = lead + width(&key) + 1 + width(&label);
            if used + need > w {
                if i == 0 {
                    let cut = truncate(&format!("{key} {label}"), w, t.glyphs.ellipsis);
                    let key_part = take_cols(&cut, width(&key)).to_string();
                    let rest = cut[key_part.len()..].to_string();
                    spans.extend([
                        Span::styled(key_part, t.strong),
                        Span::styled(rest, t.muted),
                    ]);
                }
                break;
            }
            if i > 0 {
                spans.push(Span::styled(sep.clone(), t.muted));
            }
            spans.extend([
                Span::styled(key, t.strong),
                Span::styled(format!(" {label}"), t.muted),
            ]);
            used += need;
        }
        Line::from(spans)
    }
}

impl Widget for KeyHints<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &[self.line(area.width)]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::theme::{ASCII, UNICODE};

    fn text(w: u16, glyphs: &'static crate::theme::Glyphs) -> String {
        let theme = Theme::no_color().with_glyphs(glyphs);
        let pairs = [
            ("Enter", "send"),
            ("Ctrl+C", "stop/quit"),
            ("Ctrl+K", "steer"),
            ("Ctrl+S", "sessions"),
        ];
        KeyHints::new(&theme, &pairs)
            .line(w)
            .spans
            .iter()
            .map(|s| s.content.as_ref())
            .collect()
    }

    #[test]
    fn pairs_that_do_not_fit_are_dropped_from_the_end() {
        assert_eq!(
            text(200, &UNICODE),
            "Enter send \u{b7} Ctrl+C stop/quit \u{b7} Ctrl+K steer \u{b7} Ctrl+S sessions"
        );
        assert_eq!(text(40, &UNICODE), "Enter send \u{b7} Ctrl+C stop/quit");
        assert_eq!(text(40, &ASCII), "Enter send - Ctrl+C stop/quit");
        assert_eq!(text(11, &UNICODE), "Enter send");
        // Even the first pair is cut with an ellipsis rather than overflow.
        assert_eq!(text(5, &UNICODE), "Ente\u{2026}");
        assert_eq!(text(0, &UNICODE), "");
        for w in 0..80 {
            assert!(width(&text(w, &UNICODE)) <= usize::from(w));
        }
    }
}
