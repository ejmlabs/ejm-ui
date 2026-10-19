//! `Prompt`: an input line.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};

use crate::fit::{put_lines, rows, truncate, truncate_start, width, wrap};
use crate::style::Theme;

/// The state of a [`Prompt`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum PromptState {
    /// Waiting for input: the prompt glyph and a cursor.
    #[default]
    Idle,
    /// Working: a spinner glyph and the word `working`, no cursor.
    Busy,
    /// The last input was refused: a fail glyph, and the message under the line.
    Error,
}

/// An input line: a glyph, the typed value (or a muted placeholder) and a cursor. Long values show
/// their end, behind an ellipsis, because the end is where the reader is typing.
///
/// The cursor here is a drawn glyph. Apps that place the terminal's own cursor call
/// [`Prompt::cursor`] with `false`.
#[derive(Clone, Copy, Debug)]
pub struct Prompt<'a> {
    theme: &'a Theme,
    value: &'a str,
    placeholder: Option<&'a str>,
    state: PromptState,
    message: Option<&'a str>,
    spin: Option<&'a str>,
    cursor: bool,
}

impl<'a> Prompt<'a> {
    /// A prompt with the current input.
    #[must_use]
    pub fn new(theme: &'a Theme, value: &'a str) -> Self {
        Self {
            theme,
            value,
            placeholder: None,
            state: PromptState::Idle,
            message: None,
            spin: None,
            cursor: true,
        }
    }

    /// Muted hint shown while the value is empty.
    #[must_use]
    pub fn placeholder(mut self, placeholder: &'a str) -> Self {
        self.placeholder = Some(placeholder);
        self
    }

    /// Pick the state.
    #[must_use]
    pub fn state(mut self, state: PromptState) -> Self {
        self.state = state;
        self
    }

    /// The sentence shown under the line in the error state.
    #[must_use]
    pub fn message(mut self, message: &'a str) -> Self {
        self.message = Some(message);
        self
    }

    /// The glyph shown while busy, from [`Theme::spinner`]. Defaults to the static running glyph.
    #[must_use]
    pub fn spin(mut self, frame: &'a str) -> Self {
        self.spin = Some(frame);
        self
    }

    /// Draw the cursor glyph. On by default.
    #[must_use]
    pub fn cursor(mut self, draw: bool) -> Self {
        self.cursor = draw;
        self
    }

    /// The lines for a width: one, or more in the error state.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let w = usize::from(w);
        let t = self.theme;
        let ell = t.glyphs.ellipsis;
        let (glyph, glyph_style): (&str, Style) = match self.state {
            PromptState::Idle => (t.glyphs.prompt, t.accent),
            PromptState::Busy => (self.spin.unwrap_or(t.glyphs.running), t.accent),
            PromptState::Error => (t.glyphs.fail, t.error),
        };
        let busy = self.state == PromptState::Busy;
        let word = "working";
        let cursor = if self.cursor && !busy {
            t.marks.cursor
        } else {
            ""
        };
        let tail = if busy {
            GAP_WORD.len() + width(word)
        } else {
            0
        };
        let room = w.saturating_sub(2 + width(cursor) + tail);

        let mut spans = vec![Span::styled(format!("{glyph} "), glyph_style)];
        if self.value.is_empty() {
            spans.push(Span::styled(cursor, t.accent));
            if let Some(hint) = self.placeholder {
                spans.push(Span::styled(truncate(hint, room, ell), t.muted));
            }
        } else {
            let style = if busy { t.muted } else { t.text };
            spans.push(Span::styled(truncate_start(self.value, room, ell), style));
            spans.push(Span::styled(cursor, t.accent));
        }
        if busy {
            spans.push(Span::styled(format!("{GAP_WORD}{word}"), t.muted));
        }
        let mut lines = vec![Line::from(spans)];
        if self.state == PromptState::Error {
            let message = self.message.unwrap_or("That input was not accepted.");
            lines.extend(
                wrap(message, w, "  ", "  ")
                    .into_iter()
                    .map(|l| Line::styled(l, t.error)),
            );
        }
        lines
    }

    /// How many rows this needs at `width`.
    #[must_use]
    pub fn height(&self, width: u16) -> u16 {
        rows(&self.lines(width))
    }
}

const GAP_WORD: &str = "  ";

impl Widget for Prompt<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}
