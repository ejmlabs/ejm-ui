//! `CommonMark` as containerless terminal text. Parsing belongs to pulldown-cmark, word placement
//! to textwrap, and code highlighting to [`crate::code_lines`]. Inline styles never create spaces.
//!
//! Headings, lists, quotes, links, literal HTML, fenced code, GFM pipe tables and conservative
//! raw-patch detection preserve their text. A partial fence renders as code. Hosts must strip
//! complete terminal escape sequences first; this widget also removes controls. No HTML or link is
//! executed.

use crate::{
    CodeLanguage, Column, Rule, Table, Theme, code_lines,
    fit::{clean, push_span, take_cols, width, wrap_columns, wrap_styled},
};
use pulldown_cmark::{Alignment, CodeBlockKind, Event, Options, Parser, Tag, TagEnd};
use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::Widget,
};

/// Wrapped terminal markdown, measured or drawn through the same rendered lines.
#[derive(Clone, Copy, Debug)]
pub struct Markdown<'a> {
    theme: &'a Theme,
    body: &'a str,
}

impl<'a> Markdown<'a> {
    /// Borrow the theme and source text.
    #[must_use]
    pub fn new(theme: &'a Theme, body: &'a str) -> Self {
        Self { theme, body }
    }

    /// Styled lines with no leading blank row. A zero-width view renders nothing.
    #[must_use]
    pub fn lines(&self, columns: u16) -> Vec<Line<'static>> {
        if columns == 0 {
            return Vec::new();
        }
        let body = clean(&self.body.replace('\t', "    "), true);
        let mut renderer = Renderer::new(self.theme, columns);
        renderer.document(&body);
        renderer.lines
    }

    /// Row count, saturated to the terminal layout's height type.
    #[must_use]
    pub fn height(&self, columns: u16) -> u16 {
        crate::fit::rows(&self.lines(columns))
    }
}

impl Widget for Markdown<'_> {
    fn render(self, area: Rect, buffer: &mut Buffer) {
        crate::fit::put_lines(buffer, area, &self.lines(area.width));
    }
}

struct Item {
    marker: String,
    fresh: bool,
}

struct TableBuild {
    alignments: Vec<Alignment>,
    header: Vec<String>,
    rows: Vec<Vec<String>>,
    current_row: Vec<String>,
    cell: String,
    in_head: bool,
}

struct Renderer<'a> {
    theme: &'a Theme,
    columns: u16,
    lines: Vec<Line<'static>>,
    spans: Vec<Span<'static>>,
    lists: Vec<Option<u64>>,
    items: Vec<Item>,
    quotes: usize,
    styles: Vec<Style>,
    links: Vec<(String, String)>,
    code: Option<(CodeLanguage, String, Option<String>)>,
    table: Option<TableBuild>,
    defs: String,
}

impl<'a> Renderer<'a> {
    fn new(theme: &'a Theme, columns: u16) -> Self {
        Self {
            theme,
            columns,
            lines: Vec::new(),
            spans: Vec::new(),
            lists: Vec::new(),
            items: Vec::new(),
            quotes: 0,
            styles: vec![theme.text],
            links: Vec::new(),
            code: None,
            table: None,
            defs: String::new(),
        }
    }

    /// A conservative pre-scan isolates raw patches before `CommonMark` can read their +/- lines
    /// as list markers. Fence content is never reclassified; prose around a patch still parses.
    fn document(&mut self, body: &str) {
        self.defs = reference_definitions(body);
        let (mut start, mut offset) = (0, 0);
        let mut patch = None;
        let mut fence = None;
        let mut html = false;
        for line in body.split_inclusive('\n') {
            if let Some(patch_start) = patch
                && !patch_line(line)
            {
                self.patch(&body[patch_start..offset]);
                patch = None;
                start = offset;
            }
            if patch.is_none() {
                let trimmed = line.trim_start();
                if html {
                    html = !trimmed.starts_with("</");
                } else if let Some((mark, count)) = fence {
                    if fence_mark(line)
                        .is_some_and(|(other, length)| other == mark && length >= count)
                        && line.trim().chars().all(|c| c == mark)
                    {
                        fence = None;
                    }
                } else if let Some(marker) = fence_mark(line) {
                    fence = Some(marker);
                } else if trimmed.starts_with('<')
                    && trimmed
                        .chars()
                        .nth(1)
                        .is_some_and(|c| c.is_ascii_alphabetic())
                {
                    html = !trimmed.contains("</");
                } else if line.starts_with("diff --git ")
                    || (line.starts_with("--- ")
                        && body[offset + line.len()..].starts_with("+++ ")
                        && body[offset..].lines().any(|row| row.starts_with("@@ -")))
                {
                    self.parse(&body[start..offset]);
                    patch = Some(offset);
                }
            }
            offset += line.len();
        }
        if let Some(patch_start) = patch {
            self.patch(&body[patch_start..]);
        } else {
            self.parse(&body[start..]);
        }
    }

    fn patch(&mut self, source: &str) {
        self.gap();
        for row in source.lines() {
            self.code(row, CodeLanguage::Diff);
        }
    }

    fn parse(&mut self, source: &str) {
        let owned = if self.defs.is_empty() {
            None
        } else {
            Some(format!("{source}\n\n{}", self.defs))
        };
        let source = owned.as_deref().unwrap_or(source);
        let mut options = Options::empty();
        options.insert(Options::ENABLE_TABLES);
        for event in Parser::new_ext(source, options) {
            match event {
                Event::Start(tag) => self.start(tag),
                Event::End(tag) => self.end(tag),
                Event::Text(text) => {
                    if let Some((_, body, _)) = &mut self.code {
                        body.push_str(&text);
                    } else if !self.push_table_text(&text) {
                        self.push_link_text(&text);
                        let style = self.style();
                        push_span(&mut self.spans, &text, style);
                    }
                }
                Event::Code(text) => {
                    if !self.push_table_text(&text) {
                        self.push_link_text(&text);
                        let style = self.style().patch(self.theme.code);
                        push_span(&mut self.spans, &text, style);
                    }
                }
                Event::SoftBreak => {
                    if !self.push_table_text(" ") {
                        self.push_link_text(" ");
                        let style = self.style();
                        push_span(&mut self.spans, " ", style);
                    }
                }
                Event::HardBreak => {
                    if !self.push_table_text(" ") {
                        self.push_link_text(" ");
                        self.flush(false);
                    }
                }
                Event::Html(text) => {
                    for row in text.split_inclusive('\n') {
                        let style = self.style();
                        push_span(&mut self.spans, row.trim_end_matches('\n'), style);
                        if row.ends_with('\n') {
                            self.flush(false);
                        }
                    }
                }
                Event::InlineHtml(text) | Event::InlineMath(text) | Event::DisplayMath(text) => {
                    let style = self.style();
                    push_span(&mut self.spans, &text, style);
                }
                Event::Rule => {
                    self.gap();
                    self.lines.push(Rule::new(self.theme).line(self.columns));
                }
                Event::FootnoteReference(_) | Event::TaskListMarker(_) => {}
            }
        }
        self.flush(false);
    }

    fn start(&mut self, tag: Tag<'_>) {
        match tag {
            Tag::Paragraph => {
                self.flush(false);
                if self.items.last().is_none_or(|item| !item.fresh) {
                    self.gap();
                }
            }
            Tag::Heading { .. } => {
                self.gap();
                self.styles
                    .push(self.theme.accent.add_modifier(Modifier::BOLD));
            }
            Tag::List(number) => {
                self.flush(false);
                if self.items.last().is_some_and(|item| item.fresh) {
                    self.flush(true);
                } else if self.lists.is_empty() {
                    self.gap();
                }
                self.lists.push(number);
            }
            Tag::Item => {
                self.flush(false);
                let marker = match self.lists.last_mut() {
                    Some(Some(number)) => {
                        let value = format!("{number}.");
                        *number = number.saturating_add(1);
                        value
                    }
                    _ => "-".into(),
                };
                self.items.push(Item {
                    marker,
                    fresh: true,
                });
            }
            Tag::BlockQuote(_) => {
                self.gap();
                self.quotes += 1;
            }
            Tag::CodeBlock(kind) => {
                self.flush(false);
                if self.items.last().is_none_or(|item| !item.fresh) {
                    self.gap();
                }
                let (language, tag) = match kind {
                    CodeBlockKind::Fenced(tag) => {
                        let tag = tag
                            .split_whitespace()
                            .next()
                            .filter(|token| !token.is_empty())
                            .map(str::to_owned);
                        (CodeLanguage::from_tag(tag.as_deref().unwrap_or("")), tag)
                    }
                    CodeBlockKind::Indented => (CodeLanguage::Plain, None),
                };
                self.code = Some((language, String::new(), tag));
            }
            Tag::HtmlBlock => self.gap(),
            Tag::Strong => self.styles.push(self.style().add_modifier(Modifier::BOLD)),
            Tag::Emphasis => self
                .styles
                .push(self.style().add_modifier(Modifier::ITALIC)),
            Tag::Link { dest_url, .. } | Tag::Image { dest_url, .. } => {
                self.links.push((dest_url.into_string(), String::new()));
            }
            Tag::Table(alignments) => {
                self.flush(false);
                self.gap();
                self.table = Some(TableBuild {
                    alignments,
                    header: Vec::new(),
                    rows: Vec::new(),
                    current_row: Vec::new(),
                    cell: String::new(),
                    in_head: false,
                });
            }
            Tag::TableHead => {
                if let Some(table) = &mut self.table {
                    table.in_head = true;
                }
            }
            _ => {}
        }
    }

    fn end(&mut self, tag: TagEnd) {
        match tag {
            TagEnd::Paragraph | TagEnd::HtmlBlock => self.flush(false),
            TagEnd::Item => {
                self.flush(true);
                self.items.pop();
            }
            TagEnd::List(_) => {
                self.flush(false);
                self.lists.pop();
            }
            TagEnd::BlockQuote(_) => {
                self.flush(false);
                self.quotes = self.quotes.saturating_sub(1);
            }
            TagEnd::Heading(_) => {
                self.flush(false);
                self.styles.pop();
            }
            TagEnd::Strong | TagEnd::Emphasis => {
                self.styles.pop();
            }
            TagEnd::CodeBlock => {
                if let Some((language, text, tag)) = self.code.take() {
                    if let Some(tag) = tag {
                        let (first, rest) = self.prefixes();
                        let columns = self
                            .columns
                            .saturating_sub(u16::try_from(width(&first)).unwrap_or(self.columns));
                        self.append(
                            wrap_columns(
                                &Line::styled(tag, self.theme.muted),
                                usize::from(columns),
                            ),
                            &first,
                            &rest,
                        );
                    }
                    let text = text.strip_suffix('\n').unwrap_or(&text);
                    for row in text.split('\n') {
                        self.code(row, language);
                    }
                }
            }
            TagEnd::Link | TagEnd::Image => {
                if let Some((target, label)) = self.links.pop()
                    && !target.is_empty()
                    && label.trim() != target
                {
                    let dest = format!(" ({target})");
                    if let Some(table) = &mut self.table {
                        table.cell.push_str(&dest);
                    } else {
                        push_span(&mut self.spans, &dest, self.theme.muted);
                    }
                }
            }
            TagEnd::TableCell => {
                if let Some(table) = &mut self.table {
                    table.current_row.push(std::mem::take(&mut table.cell));
                }
            }
            TagEnd::TableRow => {
                if let Some(table) = &mut self.table {
                    let row = std::mem::take(&mut table.current_row);
                    if table.in_head {
                        table.header = row;
                    } else {
                        table.rows.push(row);
                    }
                }
            }
            TagEnd::TableHead => {
                if let Some(table) = &mut self.table {
                    if !table.current_row.is_empty() {
                        table.header = std::mem::take(&mut table.current_row);
                    }
                    table.in_head = false;
                }
            }
            TagEnd::Table => self.flush_table(),
            _ => {}
        }
    }

    fn push_table_text(&mut self, text: &str) -> bool {
        if self.table.is_none() {
            return false;
        }
        self.push_link_text(text);
        if let Some(table) = &mut self.table {
            table.cell.push_str(text);
        }
        true
    }

    fn flush_table(&mut self) {
        let Some(built) = self.table.take() else {
            return;
        };
        if built.header.is_empty() && built.rows.is_empty() {
            return;
        }
        let columns: Vec<Column<'_>> = built
            .header
            .iter()
            .enumerate()
            .map(|(index, label)| {
                let column = Column::new(label);
                if built.alignments.get(index) == Some(&Alignment::Right) {
                    column.right()
                } else {
                    column
                }
            })
            .collect();
        let rows: Vec<Vec<&str>> = built
            .rows
            .iter()
            .map(|row| row.iter().map(String::as_str).collect())
            .collect();
        self.lines.extend(
            Table::new(self.theme, &columns)
                .rows(&rows)
                .lines(self.columns),
        );
    }

    fn push_link_text(&mut self, text: &str) {
        if let Some((_, label)) = self.links.last_mut() {
            label.push_str(text);
        }
    }

    fn style(&self) -> Style {
        self.styles.last().copied().unwrap_or(self.theme.text)
    }

    fn gap(&mut self) {
        self.flush(false);
        if self
            .lines
            .last()
            .is_some_and(|line| !line.to_string().is_empty())
        {
            self.lines.push(Line::raw(""));
        }
    }

    /// Indentation comes from the active item stack, not stale mutable paragraph state. Clip
    /// prefixes before wrapping to leave room for a wide character in a narrow view.
    fn prefixes(&self) -> (String, String) {
        let limit = usize::from(self.columns).saturating_sub(2);
        let mut first = format!("{} ", self.theme.glyphs.quote).repeat(self.quotes.min(limit / 2));
        for (index, item) in self.items.iter().enumerate() {
            if width(&first) >= limit {
                break;
            }
            if index + 1 == self.items.len() && item.fresh {
                first.push_str(&item.marker);
                first.push(' ');
            } else {
                first.push_str(&" ".repeat((width(&item.marker) + 1).min(limit)));
            }
        }
        let first = take_cols(&first, limit).to_owned();
        let mut rest = format!("{} ", self.theme.glyphs.quote).repeat(self.quotes.min(limit / 2));
        rest.push_str(&" ".repeat(width(&first).saturating_sub(width(&rest))));
        (first, rest)
    }

    fn flush(&mut self, empty_item: bool) {
        if self.spans.iter().all(|s| s.content.is_empty()) {
            self.spans.clear();
            if empty_item && self.items.last().is_some_and(|item| item.fresh) {
                let (first, _) = self.prefixes();
                self.lines
                    .push(Line::styled(first.trim_end().to_owned(), self.theme.muted));
                if let Some(item) = self.items.last_mut() {
                    item.fresh = false;
                }
            }
            return;
        }
        let (first, rest) = self.prefixes();
        let columns = usize::from(self.columns) - width(&first);
        let line = Line::from(std::mem::take(&mut self.spans));
        let rows = wrap_styled(&line, columns);
        self.append(rows, &first, &rest);
    }

    fn code(&mut self, source: &str, language: CodeLanguage) {
        let (first, rest) = self.prefixes();
        let columns = self
            .columns
            .saturating_sub(u16::try_from(width(&first)).unwrap_or(self.columns));
        self.append(
            code_lines(self.theme, language, source, columns),
            &first,
            &rest,
        );
    }

    fn append(&mut self, rows: Vec<Line<'static>>, first: &str, rest: &str) {
        for (index, mut row) in rows.into_iter().enumerate() {
            let prefix = if index == 0 { first } else { rest };
            if !prefix.is_empty() {
                row.spans
                    .insert(0, Span::styled(prefix.to_owned(), self.theme.muted));
            }
            self.lines.push(row);
        }
        if let Some(item) = self.items.last_mut() {
            item.fresh = false;
        }
    }
}

fn reference_definitions(body: &str) -> String {
    body.lines()
        .filter(|line| {
            let line = line.trim();
            line.starts_with('[') && line.contains("]:")
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn fence_mark(line: &str) -> Option<(char, usize)> {
    let source = line.trim_start_matches(' ');
    if line.len() - source.len() > 3 {
        return None;
    }
    let mark = source.chars().next()?;
    if !matches!(mark, '\u{60}' | '~') {
        return None;
    }
    let count = source.chars().take_while(|c| *c == mark).count();
    (count >= 3).then_some((mark, count))
}

fn patch_line(line: &str) -> bool {
    line.starts_with(['+', '-', ' '])
        || line.starts_with("@@ ")
        || line.starts_with("diff --git ")
        || line.starts_with("index ")
        || line.starts_with("\\ No newline at end of file")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ColorDepth, theme::ASCII};

    fn rows(lines: &[Line<'_>]) -> Vec<String> {
        lines.iter().map(ToString::to_string).collect()
    }

    #[test]
    fn style_changes_do_not_split_combining_or_zwj_graphemes() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        for (body, expected) in [
            ("\u{60}👩\u{60}\u{200d}💻", "👩‍💻"),
            ("**e**\u{301}", "e\u{301}"),
        ] {
            let lines = Markdown::new(&theme, body).lines(2);
            assert_eq!(rows(&lines), [expected]);
            assert_eq!(lines[0].spans.len(), 1);
        }
    }

    #[test]
    fn an_empty_parent_list_item_precedes_its_nested_children() {
        assert_eq!(
            rows(&Markdown::new(&Theme::no_color(), "-\n  - child").lines(40)),
            ["-", "  - child"]
        );
    }

    #[test]
    fn references_resolve_across_raw_patches_without_dropping_html() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        let patch = "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new";
        let body = format!("[docs][d]\n\n{patch}\n\n[d]: https://example.com");
        let text = rows(&Markdown::new(&theme, &body).lines(80));
        assert_eq!(
            text.first().map(String::as_str),
            Some("docs (https://example.com)")
        );
        let html = format!("<pre>\n{patch}\n</pre>");
        let lines = Markdown::new(&theme, &html).lines(80);
        assert_eq!(rows(&lines), html.lines().collect::<Vec<_>>());
        assert!(
            lines
                .iter()
                .flat_map(|l| &l.spans)
                .all(|s| s.style == theme.text)
        );
    }

    #[test]
    fn raw_patch_candidates_without_a_hunk_stay_markdown() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        let body = "--- a\n+++ b\n\n".repeat(200);
        let lines = Markdown::new(&theme, &body).lines(80);
        assert!(
            lines
                .iter()
                .flat_map(|l| &l.spans)
                .all(|s| s.style != theme.error && s.style != theme.ok)
        );
    }

    #[test]
    fn hard_breaks_do_not_erase_link_deduplication_state() {
        let lines = Markdown::new(
            &Theme::no_color(),
            "[https://example.com  \n](https://example.com)",
        )
        .lines(80);
        assert_eq!(
            rows(&lines)
                .join(" ")
                .matches("https://example.com")
                .count(),
            1
        );
    }

    #[test]
    fn tight_lists_keep_items_separate() {
        let theme = Theme::no_color();
        for (body, expected) in [
            ("- one\n- two", vec!["- one", "- two"]),
            ("1. first\n2. second", vec!["1. first", "2. second"]),
        ] {
            assert_eq!(rows(&Markdown::new(&theme, body).lines(40)), expected);
        }
    }

    #[test]
    fn inline_styles_do_not_insert_spaces_or_lose_punctuation() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        let lines = Markdown::new(&theme, "Use \u{60}foo\u{60}. **a**b").lines(40);
        assert_eq!(rows(&lines), ["Use foo. ab"]);
        assert!(
            lines
                .iter()
                .flat_map(|l| &l.spans)
                .any(|s| { s.content == "foo" && s.style == theme.code })
        );
        assert!(
            lines
                .iter()
                .flat_map(|l| &l.spans)
                .any(|s| { s.content == "a" && s.style.add_modifier.contains(Modifier::BOLD) })
        );
    }

    #[test]
    fn block_boundaries_restore_indentation_and_have_no_leading_blank() {
        let theme = Theme::no_color();
        let lines = Markdown::new(&theme, "# Head\n\n- one\n  - nested\n\nAfter").lines(40);
        let text = rows(&lines);
        assert_eq!(text.first().map(String::as_str), Some("Head"));
        assert_eq!(text.last().map(String::as_str), Some("After"));
        assert_eq!(
            text.iter()
                .filter(|line| !line.is_empty())
                .cloned()
                .collect::<Vec<_>>(),
            ["Head", "- one", "  - nested", "After"]
        );
        let hard = Markdown::new(&theme, "one  \ntwo").lines(40);
        assert_eq!(rows(&hard), ["one", "two"]);
    }

    #[test]
    fn links_and_literal_html_remain_visible() {
        let theme = Theme::no_color();
        for (body, expected) in [
            ("[docs](https://example.com)", "docs (https://example.com)"),
            ("<https://example.com>", "https://example.com"),
            ("Use <Foo /> here.", "Use <Foo /> here."),
        ] {
            assert_eq!(rows(&Markdown::new(&theme, body).lines(80)), [expected]);
        }
    }

    #[test]
    fn fences_preserve_code_rows_and_partial_streams() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        for close in ["", "\u{60}\u{60}\u{60}\n"] {
            let body = format!("\u{60}\u{60}\u{60}rust\nlet a = 1;\n\nlet b = 2;\n{close}");
            let lines = Markdown::new(&theme, &body).lines(40);
            assert_eq!(rows(&lines), ["rust", "let a = 1;", "", "let b = 2;"]);
            assert!(!rows(&lines).iter().any(|row| row.contains('\u{60}')));
            assert!(
                lines
                    .iter()
                    .flat_map(|l| &l.spans)
                    .any(|s| { s.content == "let" && s.style == theme.syntax.keyword })
            );
        }
    }

    #[test]
    fn unfenced_patches_render_as_diffs_not_lists() {
        let theme = Theme::new(ColorDepth::TrueColor, false);
        let body = "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n - context";
        let lines = Markdown::new(&theme, body).lines(80);
        assert_eq!(rows(&lines), body.lines().collect::<Vec<_>>());
        assert_eq!(lines[1].spans[0].style, theme.muted);
        assert_eq!(lines[4].spans[0].style, theme.error);
        assert_eq!(lines[5].spans[0].style, theme.ok);
        assert_eq!(lines[6].spans[0].style, theme.text);
    }

    #[test]
    fn narrow_wide_words_terminate_and_stay_within_columns() {
        let theme = Theme::no_color();
        for width in [3, 4, 20, 40] {
            let lines = Markdown::new(&theme, "- 界界").lines(width);
            assert!(lines.iter().all(|l| l.width() <= usize::from(width)));
            assert_eq!(
                rows(&lines).join("").chars().filter(|c| *c == '界').count(),
                2
            );
        }
    }

    #[test]
    fn no_color_and_ascii_keep_emphasis_and_quote_markers() {
        let theme = Theme::no_color().with_glyphs(&ASCII);
        let lines = Markdown::new(&theme, "> **bold** and *soft*").lines(40);
        assert_eq!(rows(&lines), ["| bold and soft"]);
        let spans = lines.iter().flat_map(|l| &l.spans).collect::<Vec<_>>();
        assert!(
            spans
                .iter()
                .all(|s| s.style.fg.is_none() && s.style.bg.is_none())
        );
        assert!(
            spans
                .iter()
                .any(|s| s.content == "bold" && s.style.add_modifier.contains(Modifier::BOLD))
        );
        assert!(
            spans
                .iter()
                .any(|s| s.content == "soft" && s.style.add_modifier.contains(Modifier::ITALIC))
        );
        assert_eq!(Markdown::new(&theme, "").lines(40), Vec::<Line<'_>>::new());
        assert_eq!(
            Markdown::new(&theme, "not empty").lines(0),
            Vec::<Line<'_>>::new()
        );
    }

    #[test]
    fn gfm_tables_use_the_table_widget() {
        let theme = Theme::no_color();
        let body = "| Name | Count |\n| --- | ---: |\n| alpha | 2 |\n| beta | 10 |";
        let text = rows(&Markdown::new(&theme, body).lines(40));
        assert!(
            text.iter()
                .any(|line| line.contains("Name") && line.contains("Count")),
            "{text:?}"
        );
        assert!(
            text.iter()
                .any(|line| line.contains("alpha") && line.contains('2')),
            "{text:?}"
        );
        assert!(
            text.iter()
                .any(|line| line.contains("beta") && line.contains("10")),
            "{text:?}"
        );
        assert!(!text.iter().any(|line| line.contains('|')), "{text:?}");
        let count_header = text
            .iter()
            .find(|line| line.contains("Count"))
            .expect("header");
        let count_at = count_header.find("Count").expect("Count");
        let ten = text.iter().find(|line| line.contains("10")).expect("10");
        assert!(
            ten[count_at..].starts_with("10") || ten.contains("10"),
            "{ten}"
        );
        let two = text.iter().find(|line| line.contains('2')).expect("2");
        let two_at = two.rfind('2').expect("digit");
        assert!(two_at >= count_at, "{two} vs {count_header}");
    }

    #[test]
    fn narrow_gfm_tables_drop_trailing_columns() {
        let theme = Theme::no_color();
        let body = "| Session | Model | Cost |\n| --- | --- | --- |\n| one | two | three |";
        let text = rows(&Markdown::new(&theme, body).lines(12));
        assert!(text.iter().all(|line| width(line) <= 12), "{text:?}");
        assert!(text.iter().any(|line| line.contains("Se")), "{text:?}");
        assert!(!text.iter().any(|line| line.contains("Cost")), "{text:?}");
        assert!(!text.iter().any(|line| line.contains("three")), "{text:?}");
    }
}
