//! Measuring and fitting text in terminal columns.
//!
//! Every width in this crate is a column count from `unicode-width`, never `len()`. Text that
//! reaches a widget may come from the network, tools or files, so control characters are
//! removed here, in the one place all widget text passes through. Escape sequences therefore
//! cannot reach the terminal, although their printable remainder (`[31m`) stays visible.

use ratatui::style::Style;
use ratatui::text::{Line, Span};
use unicode_truncate::UnicodeTruncateStr;
use unicode_width::UnicodeWidthStr;

/// Display width in terminal columns.
#[must_use]
pub fn width(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

/// Drop control characters. A tab becomes a space. A newline is kept only when `keep_newline`.
pub(crate) fn clean(s: &str, keep_newline: bool) -> String {
    s.chars()
        .filter_map(|c| match c {
            '\t' => Some(' '),
            '\n' => Some(if keep_newline { '\n' } else { ' ' }),
            c if c.is_control() => None,
            c => Some(c),
        })
        .collect()
}

/// The longest prefix of `s` that fits in `max` columns. Never splits a wide character.
pub(crate) fn take_cols(s: &str, max: usize) -> &str {
    s.unicode_truncate(max).0
}

/// Cut `s` to `max` columns, ending with `ellipsis` when something was removed.
#[must_use]
pub fn truncate(s: &str, max: usize, ellipsis: &str) -> String {
    let s = clean(s, false);
    if width(&s) <= max {
        return s;
    }
    if width(ellipsis) >= max {
        return take_cols(ellipsis, max).to_string();
    }
    format!("{}{ellipsis}", take_cols(&s, max - width(ellipsis)))
}

/// The last `max` columns of `s`, starting with `ellipsis` when something was removed. For input
/// lines, where the end is what the reader is typing.
#[must_use]
pub fn truncate_start(s: &str, max: usize, ellipsis: &str) -> String {
    let s = clean(s, false);
    if width(&s) <= max {
        return s;
    }
    if width(ellipsis) >= max {
        return take_cols(ellipsis, max).to_string();
    }
    format!(
        "{ellipsis}{}",
        s.unicode_truncate_start(max - width(ellipsis)).0
    )
}

/// Pad with spaces on the right up to `w` columns.
#[must_use]
pub fn pad_right(s: &str, w: usize) -> String {
    format!("{s}{}", " ".repeat(w.saturating_sub(width(s))))
}

/// Pad with spaces on the left up to `w` columns.
#[must_use]
pub fn pad_left(s: &str, w: usize) -> String {
    format!("{}{s}", " ".repeat(w.saturating_sub(width(s))))
}

/// Wrap prose to `w` columns. The first line starts with `first`, the others with `rest`, which
/// gives a hanging indent. Long words break by column. Always returns at least one line, and no
/// line is wider than `w` (an indent is cut to leave room for one wide character).
pub(crate) fn wrap(text: &str, w: usize, first: &str, rest: &str) -> Vec<String> {
    let w = w.max(1);
    let first = take_cols(first, w.saturating_sub(2));
    let rest = take_cols(rest, w.saturating_sub(2));
    let text = clean(text, true);
    let options = textwrap::Options::new(w)
        .initial_indent(first)
        .subsequent_indent(rest)
        .break_words(true);
    let lines: Vec<String> = textwrap::wrap(&text, options)
        .into_iter()
        .map(std::borrow::Cow::into_owned)
        .collect();
    if lines.is_empty() {
        vec![first.to_string()]
    } else {
        lines
    }
}

/// Join styled pieces into one line no wider than `max`, ending with `ellipsis` if cut.
pub(crate) fn fit(parts: Vec<(String, Style)>, max: usize, ellipsis: &str) -> Line<'static> {
    let total: usize = parts.iter().map(|(t, _)| width(t)).sum();
    if total <= max {
        return Line::from(
            parts
                .into_iter()
                .map(|(t, s)| Span::styled(t, s))
                .collect::<Vec<_>>(),
        );
    }
    let mut budget = max.saturating_sub(width(ellipsis));
    let (mut spans, mut last) = (Vec::new(), Style::default());
    for (text, style) in parts {
        if budget == 0 {
            break;
        }
        let piece = take_cols(&text, budget);
        budget -= width(piece);
        last = style;
        let cut = piece.len() < text.len();
        spans.push(Span::styled(piece.to_string(), style));
        if cut {
            break;
        }
    }
    spans.push(Span::styled(take_cols(ellipsis, max).to_string(), last));
    Line::from(spans)
}

/// Draw `lines` top to bottom in `area`, one per row, clipping to the area.
pub(crate) fn put_lines(
    buf: &mut ratatui::buffer::Buffer,
    area: ratatui::layout::Rect,
    lines: &[Line<'_>],
) {
    for (row, line) in lines.iter().enumerate().take(usize::from(area.height)) {
        let y = area
            .y
            .saturating_add(u16::try_from(row).unwrap_or(u16::MAX));
        buf.set_line(area.x, y, line, area.width);
    }
}

/// A line count as the `u16` that `Rect` heights use.
pub(crate) fn rows(lines: &[Line<'_>]) -> u16 {
    u16::try_from(lines.len()).unwrap_or(u16::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ELL: &str = "\u{2026}";
    const WIDE: &str = "\u{754c}\u{754c}\u{754c}";

    #[test]
    fn truncate_counts_columns_not_bytes() {
        assert_eq!(truncate("abcdef", 6, ELL), "abcdef");
        assert_eq!(truncate("abcdef", 4, ELL), "abc\u{2026}");
        assert_eq!(truncate("abcdef", 4, "..."), "a...");
        // Each wide character is two columns and is never split.
        assert_eq!(truncate(WIDE, 4, ELL), "\u{754c}\u{2026}");
        assert_eq!(truncate(WIDE, 5, ELL), "\u{754c}\u{754c}\u{2026}");
        assert_eq!(truncate("a\u{1f980}b", 3, ELL), "a\u{2026}");
        assert_eq!(truncate("abc", 0, ELL), "");
        assert_eq!(truncate("abcdef", 1, "..."), ".");
        for w in 0..10 {
            assert!(width(&truncate("\u{754c}a\u{754c}bc\u{1f980}", w, ELL)) <= w);
            assert!(width(&truncate_start("\u{754c}a\u{754c}bc\u{1f980}", w, ELL)) <= w);
        }
        assert_eq!(truncate_start("abcdef", 4, ELL), "\u{2026}def");
    }

    #[test]
    fn wrapping_keeps_the_hanging_indent_and_never_exceeds_the_width() {
        assert_eq!(wrap("one two three", 7, "", ""), ["one two", "three"]);
        assert_eq!(
            wrap("one two three", 9, "> ", "  "),
            ["> one two", "  three"]
        );
        assert_eq!(wrap("abcdefghij", 4, "", ""), ["abcd", "efgh", "ij"]);
        assert_eq!(wrap("", 10, "", ""), [""]);
        let text = "The test reads the wall clock, so I will inject one. \u{754c}\u{754c}\u{754c} supercalifragilistic";
        for w in 0..30 {
            for l in wrap(text, w, "- ", "  ") {
                // A wide character cannot be narrower than two columns.
                assert!(width(&l) <= w.max(2), "{l:?} at {w}");
            }
        }
    }

    #[test]
    fn control_characters_are_dropped() {
        assert_eq!(clean("a\u{1b}[0mb\tc\nd\u{7}", false), "a[0mb c d");
        assert_eq!(clean("a\nb", true), "a\nb");
    }
}
