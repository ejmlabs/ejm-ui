//! Small, line-local code highlighting using the generated syntax styles.
//!
//! Code and diff output column-wraps without discarding text. Unknown tags stay plain. Tabs
//! become four spaces and controls are stripped; hosts must still strip complete terminal escape
//! sequences before calling this API. Syntax degrades to plain and bold on 16-color or `NO_COLOR`.

use crate::{
    Theme,
    fit::{clean, push_span, wrap_columns},
};
use ratatui::{
    style::Style,
    text::{Line, Span},
};

/// Syntax family chosen by a fence's first information token.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CodeLanguage {
    /// Unknown or absent language tag.
    #[default]
    Plain,
    /// Rust.
    Rust,
    /// JavaScript and TypeScript.
    Script,
    /// Python.
    Python,
    /// JSON.
    Json,
    /// Bourne-style shells.
    Shell,
    /// TOML and YAML.
    Config,
    /// Unified patches.
    Diff,
}

impl CodeLanguage {
    /// Resolve common fence tags; unrecognized tags are plain text.
    #[must_use]
    pub fn from_tag(tag: &str) -> Self {
        match tag
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase()
            .as_str()
        {
            "rust" | "rs" => Self::Rust,
            "ts" | "tsx" | "js" | "jsx" | "typescript" | "javascript" => Self::Script,
            "python" | "py" => Self::Python,
            "json" => Self::Json,
            "bash" | "sh" | "shell" | "zsh" => Self::Shell,
            "toml" | "yaml" | "yml" => Self::Config,
            "diff" | "patch" => Self::Diff,
            _ => Self::Plain,
        }
    }

    fn keywords(self) -> &'static [&'static str] {
        match self {
            Self::Rust => &[
                "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else",
                "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match",
                "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct",
                "super", "trait", "true", "type", "unsafe", "use", "where", "while",
            ],
            Self::Script => &[
                "async",
                "await",
                "break",
                "case",
                "catch",
                "class",
                "const",
                "continue",
                "default",
                "delete",
                "do",
                "else",
                "export",
                "extends",
                "false",
                "finally",
                "for",
                "function",
                "if",
                "import",
                "in",
                "instanceof",
                "interface",
                "let",
                "new",
                "null",
                "of",
                "private",
                "protected",
                "public",
                "readonly",
                "return",
                "static",
                "super",
                "switch",
                "this",
                "throw",
                "true",
                "try",
                "type",
                "typeof",
                "undefined",
                "var",
                "void",
                "while",
                "yield",
            ],
            Self::Python => &[
                "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
                "del", "elif", "else", "except", "False", "finally", "for", "from", "global", "if",
                "import", "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "raise",
                "return", "True", "try", "while", "with", "yield",
            ],
            Self::Shell => &[
                "case", "do", "done", "elif", "else", "esac", "fi", "for", "function", "if", "in",
                "then", "until", "while",
            ],
            Self::Config | Self::Json => &["true", "false", "null"],
            Self::Plain | Self::Diff => &[],
        }
    }

    fn comment(self, source: &[char], index: usize) -> bool {
        match self {
            Self::Rust | Self::Script => {
                source[index] == '/' && source.get(index + 1) == Some(&'/')
            }
            Self::Python => source[index] == '#',
            Self::Shell | Self::Config => {
                source[index] == '#' && (index == 0 || source[index - 1].is_whitespace())
            }
            _ => false,
        }
    }

    fn quote(self, source: &[char], index: usize) -> bool {
        match source[index] {
            '"' => true,
            '\u{27}' if self == Self::Rust => {
                source.get(index + 2) == Some(&'\u{27}') || source.get(index + 1) == Some(&'\\')
            }
            '\u{27}' => self != Self::Json,
            '\u{60}' => self == Self::Script,
            _ => false,
        }
    }
}

/// Highlight and column-wrap one source line. No trailing source text is discarded.
///
/// A zero-column area produces no lines; an empty line produces one blank line. A grapheme
/// wider than the whole area becomes `?`, preventing a one-column view from hanging.
#[must_use]
pub fn code_lines(
    theme: &Theme,
    language: CodeLanguage,
    source: &str,
    columns: u16,
) -> Vec<Line<'static>> {
    if columns == 0 {
        return Vec::new();
    }
    let expanded = source.replace('\t', "    ");
    let source = clean(&expanded, false);
    let line = match language {
        CodeLanguage::Plain => Line::styled(source, theme.text),
        CodeLanguage::Diff => {
            let style = diff_style(theme, &source);
            Line::styled(source, style)
        }
        _ => highlight(theme, language, &source),
    };
    wrap_columns(&line, usize::from(columns))
}

fn diff_style(theme: &Theme, source: &str) -> Style {
    if source.starts_with("+++")
        || source.starts_with("---")
        || source.starts_with("diff ")
        || source.starts_with("index ")
    {
        theme.muted
    } else if source.starts_with("@@") {
        theme.info
    } else if source.starts_with('+') {
        theme.ok
    } else if source.starts_with('-') {
        theme.error
    } else {
        theme.text
    }
}

fn highlight(theme: &Theme, language: CodeLanguage, source: &str) -> Line<'static> {
    // ponytail: line-local tokens do not track multiline comments/docstrings; add fence-local
    // lexer state if real snippets require full-language highlighting.
    let chars: Vec<char> = source.chars().collect();
    let mut spans: Vec<Span<'static>> = Vec::new();
    let mut index = 0;
    while index < chars.len() {
        let start = index;
        let character = chars[index];
        let style = if language.comment(&chars, index) {
            index = chars.len();
            theme.syntax.comment
        } else if language.quote(&chars, index) {
            index += 1;
            while index < chars.len() {
                let next = chars[index];
                index += 1;
                if next == '\\' && index < chars.len() {
                    index += 1;
                } else if next == character {
                    break;
                }
            }
            theme.syntax.string
        } else if character.is_ascii_digit() {
            index += 1;
            while index < chars.len()
                && (chars[index].is_ascii_alphanumeric() || matches!(chars[index], '.' | '_'))
            {
                index += 1;
            }
            theme.syntax.number
        } else if character.is_alphabetic() || character == '_' {
            index += 1;
            while index < chars.len() && (chars[index].is_alphanumeric() || chars[index] == '_') {
                index += 1;
            }
            let word: String = chars[start..index].iter().collect();
            if language.keywords().contains(&word.as_str()) {
                theme.syntax.keyword
            } else {
                theme.text
            }
        } else {
            index += 1;
            while index < chars.len()
                && !chars[index].is_alphanumeric()
                && chars[index] != '_'
                && !language.quote(&chars, index)
                && !language.comment(&chars, index)
            {
                index += 1;
            }
            theme.text
        };
        let token: String = chars[start..index].iter().collect();
        push_span(&mut spans, &token, style);
    }
    Line::from(spans)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ColorDepth;
    use ratatui::style::Modifier;

    fn first_line(
        theme: &Theme,
        language: CodeLanguage,
        source: &str,
        columns: u16,
    ) -> Line<'static> {
        code_lines(theme, language, source, columns)
            .into_iter()
            .next()
            .unwrap_or_default()
    }

    fn theme() -> Theme {
        Theme::new(ColorDepth::TrueColor, false)
    }

    #[test]
    fn wrapping_does_not_discard_the_end_of_code() {
        let theme = theme();
        let source = "let value = 123;";
        let lines = code_lines(&theme, CodeLanguage::Rust, source, 4);
        assert!(lines.iter().all(|line| line.width() <= 4));
        assert_eq!(
            lines.iter().map(ToString::to_string).collect::<String>(),
            source
        );
    }

    #[test]
    fn code_normalizes_tabs_and_strips_controls_before_highlighting() {
        let theme = theme();
        let line = first_line(&theme, CodeLanguage::Rust, "let\tx = 1;\x1b[0m\x07", 80);
        assert_eq!(line.to_string(), "let    x = 1;[0m");
        assert!(!line.to_string().chars().any(char::is_control));
    }

    #[test]
    fn hash_comments_do_not_swallow_urls_or_shell_parameters() {
        let theme = theme();
        for (language, source, comment) in [
            (CodeLanguage::Config, "size = 1 # note", "# note"),
            (CodeLanguage::Shell, "echo $# \u{24}{#x} # note", "# note"),
        ] {
            let line = first_line(&theme, language, source, 80);
            let comments: String = line
                .spans
                .iter()
                .filter(|s| s.style == theme.syntax.comment)
                .map(|s| s.content.as_ref())
                .collect();
            assert_eq!(comments, comment, "{source}");
        }
        let url = first_line(&theme, CodeLanguage::Config, "url: https://example.com", 80);
        assert!(url.spans.iter().all(|s| s.style != theme.syntax.comment));
    }

    #[test]
    fn rust_lifetimes_are_not_strings_but_character_literals_are() {
        let theme = theme();
        let line = first_line(
            &theme,
            CodeLanguage::Rust,
            "fn f<'a>(x: &'a str) { let c = 'x'; }",
            80,
        );
        let strings: String = line
            .spans
            .iter()
            .filter(|s| s.style == theme.syntax.string)
            .map(|s| s.content.as_ref())
            .collect();
        assert_eq!(strings, "'x'");
    }

    #[test]
    fn diff_headers_and_context_are_not_additions_or_removals() {
        let theme = theme();
        for (source, style) in [
            ("+++ b/x", theme.muted),
            ("--- a/x", theme.muted),
            ("diff --git a/x b/x", theme.muted),
            ("@@ -1 +1 @@", theme.info),
            ("+new", theme.ok),
            ("-old", theme.error),
            (" - context", theme.text),
            (" + context", theme.text),
        ] {
            let line = first_line(&theme, CodeLanguage::Diff, source, 80);
            assert!(
                line.spans.iter().all(|s| s.style == style),
                "{source}: {line:?}"
            );
        }
    }

    #[test]
    fn family_dispatch_keeps_no_color_plain_and_bold() {
        let theme = theme();
        for (tag, source, token, style) in [
            ("RS", "fn f() {}", "fn", theme.syntax.keyword),
            ("tsx", "const n = 42;", "const", theme.syntax.keyword),
            ("python", "def f():", "def", theme.syntax.keyword),
            ("json", "{\"a\": 1}", "\"a\"", theme.syntax.string),
            ("bash", "if true; then", "if", theme.syntax.keyword),
            ("toml", "enabled = true", "true", theme.syntax.keyword),
        ] {
            let line = first_line(&theme, CodeLanguage::from_tag(tag), source, 80);
            assert!(
                line.spans
                    .iter()
                    .any(|s| s.content == token && s.style == style),
                "{tag}"
            );
        }
        let theme = Theme::no_color();
        let line = first_line(&theme, CodeLanguage::Rust, "let s = \"x\";", 80);
        assert!(
            line.spans
                .iter()
                .all(|s| s.style.fg.is_none() && s.style.bg.is_none())
        );
        assert!(
            line.spans
                .iter()
                .any(|s| s.content == "let" && s.style.add_modifier.contains(Modifier::BOLD))
        );
        let plain = first_line(&theme, CodeLanguage::from_tag("unknown"), "let n = 42", 80);
        assert!(plain.spans.iter().all(|s| s.style == theme.text));
    }
}
