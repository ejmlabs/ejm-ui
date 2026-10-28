//! Conversation blocks for terminal agents: messages, tool calls, Markdown and a command menu.
//!
//! Every line of a message or tool call starts with a two-column gutter. The gutter glyph names
//! the block, so a transcript reads under `NO_COLOR` and in ASCII: `›` you, `●` the assistant,
//! `!` a notice, `✗` an error, and a state glyph for a tool call. Text wraps under the gutter.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Widget;
use strum::{EnumIter, IntoStaticStr};
use unicode_width::UnicodeWidthChar;

use crate::fit::{clean, pad_right, put_lines, rows, truncate, width};
use crate::style::Theme;

/// Columns of the gutter before message and tool call text.
const GUTTER: usize = 2;
/// Output lines a finished tool call shows before it collapses.
const PREVIEW_LINES: usize = 4;
/// Output lines a failed tool call shows, because the error is usually the point.
const ERROR_LINES: usize = 8;

/// Who a [`Message`] is from.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum MessageKind {
    /// The person at the terminal.
    #[default]
    User,
    /// The model. Drawn with [`Markdown`].
    Assistant,
    /// A host notice, such as a queued message or a changed setting.
    Notice,
    /// A failure and the next step.
    Error,
}

/// One conversation message: a gutter glyph, then text wrapped under a hanging indent.
#[derive(Clone, Copy, Debug)]
pub struct Message<'a> {
    theme: &'a Theme,
    kind: MessageKind,
    text: &'a str,
    title: Option<&'a str>,
}

impl<'a> Message<'a> {
    /// A message of `kind` with `text`. Untrusted text is safe: control characters are removed.
    #[must_use]
    pub fn new(theme: &'a Theme, kind: MessageKind, text: &'a str) -> Self {
        Self {
            theme,
            kind,
            text,
            title: None,
        }
    }

    /// A short title for a notice, printed as `title: text`. Other kinds ignore it.
    #[must_use]
    pub fn title(mut self, title: &'a str) -> Self {
        self.title = Some(title);
        self
    }

    /// The gutter glyph for a kind.
    #[must_use]
    pub fn glyph(theme: &Theme, kind: MessageKind) -> &'static str {
        match kind {
            MessageKind::User => theme.glyphs.prompt,
            MessageKind::Assistant => theme.glyphs.running,
            MessageKind::Notice => theme.glyphs.warn,
            MessageKind::Error => theme.glyphs.fail,
        }
    }

    /// The message as lines no wider than `w`.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let t = self.theme;
        let w = usize::from(w);
        let glyph = Self::glyph(t, self.kind);
        let (glyph_style, text_style) = match self.kind {
            MessageKind::User => (t.accent, t.text),
            MessageKind::Assistant => (t.text, t.text),
            MessageKind::Notice => (t.warn, t.text),
            MessageKind::Error => (t.error, t.error),
        };
        let gutter = vec![Span::styled(format!("{glyph} "), glyph_style)];
        if self.kind == MessageKind::Assistant {
            // Assistant text is Markdown, drawn by the shared renderer under the gutter.
            let body = crate::Markdown::new(t, self.text)
                .lines(u16::try_from(w.saturating_sub(GUTTER)).unwrap_or(u16::MAX));
            return body
                .into_iter()
                .enumerate()
                .map(|(index, line)| {
                    let mut spans = if index == 0 {
                        gutter.clone()
                    } else {
                        indent(GUTTER)
                    };
                    spans.extend(line.spans);
                    Line::from(spans)
                })
                .collect();
        }
        let text = match self.title.filter(|_| self.kind == MessageKind::Notice) {
            Some(title) if !title.is_empty() => format!("{title}: {}", self.text),
            _ => self.text.to_owned(),
        };
        let mut lines = Vec::new();
        for (index, line) in clean(&text, true).split('\n').enumerate() {
            let first = if index == 0 {
                gutter.clone()
            } else {
                indent(GUTTER)
            };
            lines.extend(wrap_spans(
                vec![Span::styled(line.to_owned(), text_style)],
                first,
                &indent(GUTTER),
                w,
            ));
        }
        lines
    }

    /// Rows [`Message::lines`] takes at width `w`.
    #[must_use]
    pub fn height(&self, w: u16) -> u16 {
        rows(&self.lines(w))
    }
}

impl Widget for Message<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}

/// Where a [`ToolCall`] is.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum ToolCallState {
    /// Waiting for capacity.
    #[default]
    Queued,
    /// Executing.
    Running,
    /// Finished.
    Done,
    /// Finished with an error.
    Failed,
}

/// One tool call: state glyph, name and main argument, then a preview of its output.
#[derive(Clone, Copy, Debug)]
pub struct ToolCall<'a> {
    theme: &'a Theme,
    state: ToolCallState,
    name: &'a str,
    detail: &'a str,
    output: &'a str,
    expanded: bool,
    expand_key: Option<&'a str>,
    spin: Option<&'a str>,
}

impl<'a> ToolCall<'a> {
    /// A call of the tool `name` in `state`.
    #[must_use]
    pub fn new(theme: &'a Theme, state: ToolCallState, name: &'a str) -> Self {
        Self {
            theme,
            state,
            name,
            detail: "",
            output: "",
            expanded: false,
            expand_key: None,
            spin: None,
        }
    }

    /// The argument a reader needs to recognize the call, such as a path or a pattern.
    #[must_use]
    pub fn detail(mut self, detail: &'a str) -> Self {
        self.detail = detail;
        self
    }

    /// The tool's output. Shown only once the call is done or failed.
    #[must_use]
    pub fn output(mut self, output: &'a str) -> Self {
        self.output = output;
        self
    }

    /// Show every output line instead of a preview.
    #[must_use]
    pub fn expanded(mut self, expanded: bool) -> Self {
        self.expanded = expanded;
        self
    }

    /// The host's key that expands output, named after the hidden line count. Empty means none.
    #[must_use]
    pub fn expand_key(mut self, key: &'a str) -> Self {
        self.expand_key = Some(key).filter(|key| !key.is_empty());
        self
    }

    /// The spinner frame for a running call, from [`Theme::spinner`].
    #[must_use]
    pub fn spin(mut self, frame: &'a str) -> Self {
        self.spin = Some(frame);
        self
    }

    /// The state glyph for a state.
    #[must_use]
    pub fn glyph(theme: &Theme, state: ToolCallState) -> &'static str {
        match state {
            ToolCallState::Queued => theme.glyphs.idle,
            ToolCallState::Running => theme.glyphs.running,
            ToolCallState::Done => theme.glyphs.ok,
            ToolCallState::Failed => theme.glyphs.fail,
        }
    }

    /// The call as lines no wider than `w`.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let t = self.theme;
        let w = usize::from(w);
        let ell = t.glyphs.ellipsis;
        let glyph = match (self.state, self.spin) {
            (ToolCallState::Running, Some(frame)) => frame,
            (state, _) => Self::glyph(t, state),
        };
        let glyph_style = match self.state {
            ToolCallState::Queued => t.pending,
            ToolCallState::Running => t.accent,
            ToolCallState::Done => t.ok,
            ToolCallState::Failed => t.error,
        };
        let mut head = vec![Span::styled(clean(self.name, false), t.strong)];
        if !self.detail.is_empty() {
            head.push(Span::styled(
                format!("  {}", clean(self.detail, false)),
                t.muted,
            ));
        }
        match self.state {
            ToolCallState::Queued => head.push(Span::styled("  waiting for capacity", t.muted)),
            ToolCallState::Running => head.push(Span::styled(format!("  running{ell}"), t.accent)),
            ToolCallState::Done | ToolCallState::Failed => {}
        }
        let mut lines = wrap_spans(
            head,
            vec![Span::styled(format!("{glyph} "), glyph_style)],
            &indent(GUTTER),
            w,
        );
        if matches!(self.state, ToolCallState::Queued | ToolCallState::Running) {
            return lines;
        }
        let failed = self.state == ToolCallState::Failed;
        let elbow = t.marks.elbow;
        let hang = " ".repeat(GUTTER + width(elbow) + 1);
        let output = clean(self.output, true);
        if output.trim().is_empty() {
            lines.push(Line::from(vec![
                Span::styled(format!("  {elbow} "), t.muted),
                Span::styled("no output", t.muted),
            ]));
            return lines;
        }
        let body: Vec<&str> = output.trim_end_matches('\n').split('\n').collect();
        let limit = if self.expanded {
            usize::MAX
        } else if failed {
            ERROR_LINES
        } else {
            PREVIEW_LINES
        };
        let diff = is_diff(&body);
        let room = w.saturating_sub(hang.len()).max(1);
        for (index, line) in body.iter().take(limit).enumerate() {
            let lead = if index == 0 {
                format!("  {elbow} ")
            } else {
                hang.clone()
            };
            let style = if failed {
                t.error
            } else if diff {
                diff_style(t, line).unwrap_or(t.muted)
            } else {
                t.muted
            };
            // Output is preformatted: cut long lines instead of reflowing them.
            lines.push(Line::from(vec![
                Span::styled(lead, t.muted),
                Span::styled(truncate(line, room, ell), style),
            ]));
        }
        if body.len() > limit {
            let hidden = body.len() - limit;
            let more = match self.expand_key {
                Some(key) => format!("{hang}{ell} +{hidden} lines ({key} to expand)"),
                None => format!("{hang}{ell} +{hidden} lines"),
            };
            lines.push(Line::styled(truncate(&more, w, ell), t.muted));
        }
        lines
    }

    /// Rows [`ToolCall::lines`] takes at width `w`.
    #[must_use]
    pub fn height(&self, w: u16) -> u16 {
        rows(&self.lines(w))
    }
}

impl Widget for ToolCall<'_> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        put_lines(buf, area, &self.lines(area.width));
    }
}

/// Whether a [`CommandMenu`] has choices.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, EnumIter, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub enum CommandMenuState {
    /// Choices, one selected.
    #[default]
    Default,
    /// Nothing matches. One sentence.
    Empty,
}

/// Completion choices under an input: usage and description in two aligned columns.
#[derive(Clone, Copy, Debug)]
pub struct CommandMenu<'a> {
    theme: &'a Theme,
    items: &'a [(&'a str, &'a str)],
    selected: usize,
    state: CommandMenuState,
    message: Option<&'a str>,
}

impl<'a> CommandMenu<'a> {
    /// A menu of `(usage, description)` pairs. No items reads as [`CommandMenuState::Empty`].
    #[must_use]
    pub fn new(theme: &'a Theme, items: &'a [(&'a str, &'a str)]) -> Self {
        Self {
            theme,
            items,
            selected: 0,
            state: CommandMenuState::Default,
            message: None,
        }
    }

    /// Index of the selected item.
    #[must_use]
    pub fn selected(mut self, index: usize) -> Self {
        self.selected = index;
        self
    }

    /// Force a state.
    #[must_use]
    pub fn state(mut self, state: CommandMenuState) -> Self {
        self.state = state;
        self
    }

    /// The sentence for the empty state.
    #[must_use]
    pub fn message(mut self, message: &'a str) -> Self {
        self.message = Some(message);
        self
    }

    /// Every row, no wider than `w`.
    #[must_use]
    pub fn lines(&self, w: u16) -> Vec<Line<'static>> {
        let t = self.theme;
        let w = usize::from(w);
        let ell = t.glyphs.ellipsis;
        if self.state == CommandMenuState::Empty || self.items.is_empty() {
            let message = self.message.unwrap_or("No matching commands.");
            return vec![Line::styled(
                truncate(&format!("  {message}"), w, ell),
                t.muted,
            )];
        }
        let column = self
            .items
            .iter()
            .map(|(usage, _)| width(&clean(usage, false)))
            .max()
            .unwrap_or(0)
            .min(w / 2)
            .max(8);
        self.items
            .iter()
            .enumerate()
            .map(|(index, (usage, description))| {
                let selected = index == self.selected;
                let (mark, usage_style, description_style) = if selected {
                    (
                        t.glyphs.prompt,
                        t.accent.add_modifier(Modifier::BOLD),
                        t.text,
                    )
                } else {
                    (" ", t.accent, t.muted)
                };
                let lead = format!("{mark} ");
                let usage = pad_right(&truncate(usage, column, ell), column);
                let usage = truncate(&usage, w.saturating_sub(width(&lead)), ell);
                let rest = w.saturating_sub(width(&lead) + width(&usage) + 2);
                let mut spans = vec![
                    Span::styled(lead, t.accent.add_modifier(Modifier::BOLD)),
                    Span::styled(usage, usage_style),
                ];
                if rest > 0 {
                    spans.push(Span::raw("  "));
                    spans.push(Span::styled(
                        truncate(description, rest, ell),
                        description_style,
                    ));
                }
                Line::from(spans)
            })
            .collect()
    }

    /// Rows the whole menu takes. Render into fewer rows to scroll.
    #[must_use]
    pub fn height(&self) -> u16 {
        if self.items.is_empty() || self.state == CommandMenuState::Empty {
            1
        } else {
            u16::try_from(self.items.len()).unwrap_or(u16::MAX)
        }
    }
}

impl Widget for CommandMenu<'_> {
    /// Draws the rows that fit, scrolled so the selected row stays visible.
    fn render(self, area: Rect, buf: &mut Buffer) {
        let lines = self.lines(area.width);
        let visible = usize::from(area.height);
        let start = (self.selected + 1).saturating_sub(visible).min(lines.len());
        put_lines(buf, area, &lines[start..]);
    }
}

fn indent(columns: usize) -> Vec<Span<'static>> {
    vec![Span::raw(" ".repeat(columns))]
}

fn is_diff(lines: &[&str]) -> bool {
    lines
        .iter()
        .any(|line| line.starts_with("@@ ") || line.starts_with("diff --git "))
}

/// The style of one diff line, or `None` for a context line.
fn diff_style(t: &Theme, line: &str) -> Option<Style> {
    if ["+++", "---", "diff --git", "index "]
        .iter()
        .any(|prefix| line.starts_with(prefix))
    {
        Some(t.muted)
    } else if line.starts_with("@@") {
        Some(t.info)
    } else if line.starts_with('+') {
        Some(t.ok)
    } else if line.starts_with('-') {
        Some(t.error)
    } else {
        None
    }
}

fn spans_width(spans: &[Span<'_>]) -> usize {
    spans.iter().map(|span| width(&span.content)).sum()
}

/// Word-wrap styled spans to `w` columns. `first` starts the first line and `rest` each later
/// line, which gives a hanging indent. Words wider than a line break by column, and the spaces
/// where a line breaks are dropped.
fn wrap_spans(
    spans: Vec<Span<'static>>,
    first: Vec<Span<'static>>,
    rest: &[Span<'static>],
    w: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    let mut current = first;
    let mut used = spans_width(&current);
    let mut fresh = true;
    let rest_width = spans_width(rest);
    let push = |current: &mut Vec<Span<'static>>, piece: &str, style: Style| {
        if let Some(last) = current.last_mut()
            && last.style == style
        {
            last.content.to_mut().push_str(piece);
        } else {
            current.push(Span::styled(piece.to_owned(), style));
        }
    };
    for span in spans {
        let style = span.style;
        for token in tokens(&span.content) {
            let token_width = width(token);
            let space = token.starts_with(' ');
            if used + token_width > w && !fresh {
                lines.push(finish(std::mem::replace(&mut current, rest.to_vec())));
                used = rest_width;
                fresh = true;
                if space {
                    continue;
                }
            }
            if used + token_width <= w || space {
                push(&mut current, token, style);
                used += token_width;
            } else {
                for c in token.chars() {
                    let cw = c.width().unwrap_or(0);
                    if used + cw > w && used > rest_width {
                        lines.push(finish(std::mem::replace(&mut current, rest.to_vec())));
                        used = rest_width;
                    }
                    push(&mut current, c.encode_utf8(&mut [0; 4]), style);
                    used += cw;
                }
            }
            fresh = false;
        }
    }
    lines.push(finish(current));
    lines
}

/// A wrapped line without the spaces left where it broke.
fn finish(mut spans: Vec<Span<'static>>) -> Line<'static> {
    if let Some(last) = spans.last_mut() {
        let kept = last.content.trim_end_matches(' ').len();
        last.content.to_mut().truncate(kept);
    }
    Line::from(spans)
}

/// Runs of spaces and runs of everything else.
fn tokens(text: &str) -> impl Iterator<Item = &str> {
    let mut rest = text;
    std::iter::from_fn(move || {
        let space = rest.chars().next()? == ' ';
        let end = rest
            .char_indices()
            .find(|(_, c)| (*c == ' ') != space)
            .map_or(rest.len(), |(index, _)| index);
        let (token, tail) = rest.split_at(end);
        rest = tail;
        Some(token)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::theme::ASCII;

    fn text(lines: &[Line<'_>]) -> Vec<String> {
        lines
            .iter()
            .map(|line| {
                line.spans
                    .iter()
                    .map(|span| span.content.as_ref())
                    .collect()
            })
            .collect()
    }

    #[test]
    fn wrapped_spans_keep_the_hanging_indent_inside_the_width() {
        let lines = wrap_spans(
            vec![Span::raw(
                "alpha beta gamma delta epsilon \u{754c}\u{754c}\u{754c}\u{754c}\u{754c}\u{754c}",
            )],
            vec![Span::raw("\u{25cf} ")],
            &indent(2),
            12,
        );
        let rows = text(&lines);
        assert_eq!(rows[0], "\u{25cf} alpha beta");
        assert!(rows[1..].iter().all(|row| row.starts_with("  ")));
        assert!(rows.iter().all(|row| width(row) <= 12), "{rows:?}");
    }

    #[test]
    fn assistant_markdown_sits_under_the_gutter() {
        let t = Theme::no_color().with_glyphs(&ASCII);
        let rows = text(
            &Message::new(
                &t,
                MessageKind::Assistant,
                "Read **this** first.\n\nThen that.",
            )
            .lines(30),
        );
        assert_eq!(rows[0], "* Read this first.");
        assert!(
            rows[1..]
                .iter()
                .all(|row| row.is_empty() || row.starts_with("  ")),
            "{rows:?}"
        );
    }
}
