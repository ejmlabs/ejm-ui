//! Renders every component and state of the catalog into a ratatui `TestBackend` and checks the
//! contract: the states exist, they fit at 40, 80 and 200 columns, none paints outside its area,
//! each reads under `NO_COLOR`, and the words and glyphs match `packages/core/contract.json`.

use std::collections::{BTreeSet, HashSet};

use ejm_tui::{
    Action, Callout, CalloutKind, ColorDepth, Column, KeyHints, Markdown, Prompt, PromptState, Row,
    RowState, Rule, Stat, StatState, StateBlock, StateKind, Status, StatusLevel, Table, TableState,
    Text, TextVariant, Theme, catalog, theme,
};
use ratatui::Terminal;
use ratatui::backend::TestBackend;
use ratatui::buffer::{Buffer, Cell};
use ratatui::layout::Rect;
use ratatui::style::Color;
use ratatui::widgets::Widget;
use serde_json::Value;
use strum::IntoEnumIterator;

const WIDTHS: [u16; 3] = [40, 80, 200];
const LONG: &str =
    "a-very-long-name-that-has-to-be-cut-to-fit-the-line \u{4e16}\u{754c}\u{4e16}\u{754c}";
const SENTENCE: &str = "Sessions you start are listed here, and this sentence is long enough to wrap on a narrow terminal.";

fn contract() -> Value {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../packages/core/contract.json"
    );
    serde_json::from_str(
        &std::fs::read_to_string(path).expect("contract.json is next to the crate in ejm-ui"),
    )
    .expect("valid json")
}

fn pick<S: IntoEnumIterator + Into<&'static str> + Copy>(name: &str) -> S {
    S::iter()
        .find(|s| (*s).into() == name)
        .unwrap_or_else(|| panic!("no state {name}"))
}

/// Draw one catalog entry. Panics on a (component, state) pair this test does not know, so a new
/// state in the crate fails here until it is covered.
fn draw(t: &Theme, component: &str, state: &str, area: Rect, buf: &mut Buffer) {
    match component {
        "Text" => Text::new(t, SENTENCE).render(area, buf),
        "Rule" => Rule::new(t).label("Section").render(area, buf),
        "Row" => Row::new(t, LONG)
            .value(LONG)
            .meta("2m ago")
            .state(pick::<RowState>(state))
            .render(area, buf),
        "Status" => Status::new(t, pick::<StatusLevel>(state)).render(area, buf),
        "Stat" => Stat::new(t, "Sessions this week")
            .figure("128")
            .state(pick::<StatState>(state))
            .render(area, buf),
        "Table" => {
            let columns = [
                Column::new("Session"),
                Column::new("Model").width(14),
                Column::new("Tokens").right(),
                Column::new("Cost").right(),
            ];
            let rows = [
                ["fix-flaky-retry", "deepseek-chat", "12,480", "$0.42"],
                [LONG, "deepseek-reasoner", "1,204,331", "$38.10"],
            ];
            let table = Table::new(t, &columns)
                .rows(&rows)
                .state(pick::<TableState>(state))
                .action(Action::new("Try again").key("R"));
            table.render(area, buf);
        }
        "Prompt" => Prompt::new(t, LONG)
            .state(pick::<PromptState>(state))
            .message(SENTENCE)
            .render(area, buf),
        "KeyHints" => KeyHints::new(
            t,
            &[
                ("Enter", "send"),
                ("Ctrl+C", "stop"),
                ("Ctrl+K", "steer"),
                ("Ctrl+S", "sessions"),
            ],
        )
        .render(area, buf),
        "Callout" => Callout::new(t, pick::<CalloutKind>(state), SENTENCE).render(area, buf),
        "Markdown" => Markdown::new(
            t,
            "# Head\n\nUse **bold** and `code`.\n\n- one\n\n```rust\nfn f() {}\n```\n",
        )
        .render(area, buf),
        "StateBlock" => StateBlock::new(t, pick::<StateKind>(state), SENTENCE)
            .action(Action::new("New session").key("Enter"))
            .render(area, buf),
        other => panic!("no render case for component {other}"),
    }
}

fn entries() -> Vec<(&'static str, &'static str)> {
    catalog()
        .into_iter()
        .flat_map(|(c, states)| states.into_iter().map(move |s| (c, s)))
        .collect()
}

/// Render through a `TestBackend` terminal of `width` columns.
fn terminal_buffer(t: &Theme, component: &str, state: &str, width: u16) -> Buffer {
    let mut terminal = Terminal::new(TestBackend::new(width, 14)).expect("test backend");
    terminal
        .draw(|f| draw(t, component, state, f.area(), f.buffer_mut()))
        .expect("draw");
    terminal.backend().buffer().clone()
}

/// Render one widget alone into a `width` by `height` buffer and return its text.
fn shown(widget: impl Widget, width: u16, height: u16) -> String {
    let mut buf = Buffer::empty(Rect::new(0, 0, width, height));
    widget.render(buf.area, &mut buf);
    dump(&buf)
}

fn line_of(widget: impl Widget) -> String {
    shown(widget, 60, 1)
}

/// The terminal column just after the first occurrence of `needle` in `line`.
fn end_col(line: &str, needle: &str) -> usize {
    let at = line
        .find(needle)
        .unwrap_or_else(|| panic!("{needle} not in {line}"));
    ejm_tui::width(&line[..at]) + ejm_tui::width(needle)
}

/// The buffer as text. The cell after a wide character is skipped, as a terminal does.
fn dump(buf: &Buffer) -> String {
    (0..buf.area.height)
        .map(|y| {
            let (mut row, mut x) = (String::new(), 0);
            while x < buf.area.width {
                let symbol = buf[(x, y)].symbol();
                row.push_str(symbol);
                x += u16::try_from(ejm_tui::width(symbol).max(1)).unwrap_or(1);
            }
            row.trim_end().to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn themes() -> [(&'static str, Theme); 5] {
    [
        ("dark", Theme::new(ColorDepth::TrueColor, false)),
        ("light", Theme::new(ColorDepth::TrueColor, true)),
        ("256", Theme::new(ColorDepth::Ansi256, false)),
        ("16", Theme::new(ColorDepth::Basic, true)),
        ("no_color", Theme::no_color()),
    ]
}

#[test]
fn catalog_matches_the_contract_and_is_written_for_the_parity_check() {
    let contract = contract();
    let mine = catalog();
    let claimed: Vec<_> = contract["components"]
        .as_object()
        .expect("components")
        .iter()
        .filter(|(_, c)| {
            c["targets"]
                .as_array()
                .is_some_and(|t| t.iter().any(|x| x == "rust"))
        })
        .collect();
    assert_eq!(
        claimed.len(),
        mine.len(),
        "components claimed by the contract and implemented differ"
    );
    for (name, spec) in claimed {
        let want: BTreeSet<_> = spec["states"]
            .as_array()
            .expect("states")
            .iter()
            .map(|s| s.as_str().expect("state"))
            .collect();
        let have: BTreeSet<_> = mine
            .get(name.as_str())
            .unwrap_or_else(|| panic!("{name} is missing from the catalog"))
            .iter()
            .copied()
            .collect();
        assert_eq!(have, want, "states of {name}");
    }
    let json = serde_json::to_string_pretty(&mine).expect("catalog serializes") + "\n";
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/catalog.json");
    if std::fs::read_to_string(path).ok().as_deref() != Some(&json) {
        std::fs::write(path, json).expect("write catalog.json");
    }
}

#[test]
fn glyphs_and_words_match_the_contract() {
    let c = contract();
    let g = &c["glyphs"];
    for (mode, t) in [
        ("unicode", Theme::new(ColorDepth::None, false)),
        (
            "ascii",
            Theme::new(ColorDepth::None, false).with_glyphs(&theme::ASCII),
        ),
    ] {
        let s = |v: &Value| v[mode].as_str().expect("glyph").to_string();
        for level in StatusLevel::iter() {
            let name: &str = level.into();
            let spec = &g["status"][name];
            assert_eq!(
                line_of(Status::new(&t, level)),
                format!("{} {}", s(spec), spec["label"].as_str().expect("label")),
                "status {name} in {mode}"
            );
        }
        for kind in StateKind::iter() {
            let name: &str = kind.into();
            let spec = &g["stateBlock"][name];
            let out = line_of(StateBlock::new(&t, kind, "Sentence."));
            assert!(
                out.starts_with(&format!(
                    "{} {}",
                    s(spec),
                    spec["label"].as_str().expect("label")
                )),
                "state {name} in {mode}: {out}"
            );
        }
        for kind in CalloutKind::iter() {
            let name: &str = kind.into();
            let out = Callout::new(&t, kind, "Body.").lines(30);
            let first: String = out[0].spans.iter().map(|sp| sp.content.as_ref()).collect();
            assert_eq!(
                first,
                format!(
                    "{} {}",
                    s(&g["quote"]),
                    g["callout"][name]["label"].as_str().expect("label")
                ),
                "callout {name} in {mode}"
            );
        }
        assert!(line_of(Rule::new(&t)).starts_with(&s(&g["rule"])));
        assert!(line_of(Prompt::new(&t, "x")).starts_with(&format!(
            "{} x{}",
            s(&g["prompt"]),
            s(&g["cursor"])
        )));
        assert!(
            line_of(Row::new(&t, "a").state(RowState::Selected)).starts_with(&s(&g["selected"]))
        );
        assert!(line_of(Row::new(&t, "a").state(RowState::Focused)).starts_with(&s(&g["focused"])));
        assert!(
            line_of(KeyHints::new(&t, &[("a", "b"), ("c", "d")]))
                .contains(&format!(" {} ", s(&g["separator"])))
        );
        assert_eq!(
            line_of(Text::new(&t, &"x".repeat(80))).len(),
            60,
            "text wraps instead of overflowing"
        );
        assert!(line_of(Row::new(&t, &"x".repeat(80))).ends_with(&s(&g["ellipsis"])));
        let spinner: Vec<_> = g["spinner"][mode]
            .as_array()
            .expect("spinner")
            .iter()
            .map(|x| x.as_str().expect("frame"))
            .collect();
        assert_eq!(
            (0..spinner.len() as u64)
                .map(|i| t.spinner(i * 80, false))
                .collect::<Vec<_>>(),
            spinner
        );
    }
}

#[test]
fn default_words_match_the_contract() {
    let c = contract();
    let words = &c["text"];
    let t = Theme::no_color();
    let disabled = words["row"]["disabled"].as_str().expect("word");
    assert!(
        shown(Row::new(&t, "a").state(RowState::Disabled), 60, 1)
            .starts_with(&format!("  a {disabled}"))
    );
    for (state, key) in [
        (StatState::Loading, "loading"),
        (StatState::Error, "error"),
        (StatState::Empty, "empty"),
    ] {
        let first = shown(Stat::new(&t, "Sessions").state(state), 60, 2)
            .lines()
            .next()
            .expect("line")
            .to_string();
        assert!(
            first.ends_with(words["stat"][key].as_str().expect("word")),
            "stat {key}: {first}"
        );
    }
    let columns = [Column::new("A")];
    for (state, key) in [
        (TableState::Empty, "empty"),
        (TableState::Loading, "loading"),
        (TableState::Error, "error"),
    ] {
        let out = shown(Table::new(&t, &columns).state(state), 60, 4);
        assert!(
            out.contains(words["table"][key].as_str().expect("sentence")),
            "table {key}: {out}"
        );
    }
    let busy = shown(Prompt::new(&t, "x").state(PromptState::Busy), 60, 1);
    assert!(
        busy.ends_with(words["prompt"]["busy"].as_str().expect("word")),
        "{busy}"
    );
}

#[test]
fn every_state_renders_at_40_80_and_200_columns() {
    for (mode, t) in themes() {
        for (component, state) in entries() {
            for width in WIDTHS {
                let buf = terminal_buffer(&t, component, state, width);
                assert!(
                    dump(&buf).trim().len() > 1,
                    "{component}/{state} drew nothing at {width} ({mode})"
                );
            }
        }
    }
}

#[test]
fn nothing_paints_outside_its_area_at_any_width() {
    let t = Theme::new(ColorDepth::TrueColor, false);
    let mark = Cell::new("#");
    for (component, state) in entries() {
        for width in (0..=60).chain(WIDTHS) {
            let outer = Rect::new(0, 0, width + 4, 16);
            let inner = Rect::new(2, 1, width, 14);
            let mut buf = Buffer::filled(outer, mark.clone());
            draw(&t, component, state, inner, &mut buf);
            for y in 0..outer.height {
                for x in 0..outer.width {
                    let inside = x >= inner.x
                        && x < inner.x + inner.width
                        && y >= inner.y
                        && y < inner.y + inner.height;
                    assert!(
                        inside || buf[(x, y)] == mark,
                        "{component}/{state} at width {width} wrote outside its area at ({x}, {y})"
                    );
                }
            }
        }
    }
}

#[test]
fn no_color_drops_every_color_and_every_state_still_differs() {
    let t = Theme::no_color();
    for (component, states) in catalog() {
        let mut seen = BTreeSet::new();
        for state in &states {
            for width in WIDTHS {
                let buf = terminal_buffer(&t, component, state, width);
                for cell in &buf.content {
                    assert_eq!(
                        (cell.fg, cell.bg),
                        (Color::Reset, Color::Reset),
                        "{component}/{state} has color at {width}"
                    );
                }
            }
            // States differ by text or glyph alone.
            assert!(
                seen.insert(dump(&terminal_buffer(&t, component, state, 80))),
                "{component}/{state} looks the same as another state without color"
            );
        }
    }
}

#[test]
fn plain_ascii_mode_prints_only_ascii() {
    let t = Theme::no_color().with_glyphs(&theme::ASCII);
    for (component, state) in entries() {
        let out = dump(&terminal_buffer(&t, component, state, 80));
        let allowed = |c: char| c.is_ascii() || c == '\u{4e16}' || c == '\u{754c}';
        assert!(
            out.chars().all(allowed),
            "{component}/{state} printed non-ASCII glyphs in ascii mode:\n{out}"
        );
    }
}

#[test]
fn colors_come_only_from_the_generated_theme_and_no_background_is_painted() {
    let rgb: HashSet<Color> = [&theme::DARK, &theme::LIGHT]
        .into_iter()
        .flat_map(|p| {
            [
                p.accent,
                p.dim,
                p.warning,
                p.error,
                p.success,
                p.text_muted,
                p.line,
                p.hues[0],
                p.syntax.comment,
                p.syntax.keyword,
                p.syntax.string,
                p.syntax.number,
                p.syntax.ty,
                p.syntax.type_parameter,
                p.syntax.function,
                p.syntax.mac,
                p.syntax.parameter,
                p.syntax.property,
                p.syntax.constant,
                p.syntax.namespace,
                p.syntax.identifier,
                p.syntax.delimiter,
            ]
        })
        .collect();
    let named: HashSet<Color> = [&theme::BASIC_DARK, &theme::BASIC_LIGHT]
        .into_iter()
        .flat_map(|b| [b.accent, b.dim, b.warning, b.error, b.success])
        .chain([Color::Blue, Color::Cyan])
        .collect();
    for (mode, t) in themes() {
        for (component, state) in entries() {
            for cell in terminal_buffer(&t, component, state, 80).content {
                assert_eq!(
                    cell.bg,
                    Color::Reset,
                    "{component}/{state} paints a background ({mode})"
                );
                match (mode, cell.fg) {
                    (_, Color::Reset) => {}
                    ("dark" | "light", c) => assert!(
                        rgb.contains(&c),
                        "{component}/{state}: {c:?} is not a theme color"
                    ),
                    ("256", c) => assert!(
                        matches!(c, Color::Indexed(_)),
                        "{component}/{state}: {c:?} is not a 256-color index"
                    ),
                    ("16", c) => assert!(
                        named.contains(&c),
                        "{component}/{state}: {c:?} is not a named color"
                    ),
                    ("no_color", c) => panic!("{c:?} under NO_COLOR"),
                    (m, _) => unreachable!("{m}"),
                }
            }
        }
    }
    // Light and dark really differ.
    let (dark, light) = (
        Theme::new(ColorDepth::TrueColor, false),
        Theme::new(ColorDepth::TrueColor, true),
    );
    assert_ne!(dark.accent.fg, light.accent.fg);
}

#[test]
fn text_variants_have_distinct_styles_in_color_and_strong_is_bold_without() {
    let color = Theme::new(ColorDepth::TrueColor, false);
    let styles: BTreeSet<_> = TextVariant::iter()
        .map(|v| {
            let mut buf = Buffer::empty(Rect::new(0, 0, 10, 1));
            Text::new(&color, "word")
                .variant(v)
                .render(buf.area, &mut buf);
            format!("{:?}", buf[(0, 0)].style())
        })
        .collect();
    assert_eq!(styles.len(), 4);
    let none = Theme::no_color();
    let mut buf = Buffer::empty(Rect::new(0, 0, 10, 1));
    Text::new(&none, "word")
        .variant(TextVariant::Strong)
        .render(buf.area, &mut buf);
    assert!(
        buf[(0, 0)]
            .modifier
            .contains(ratatui::style::Modifier::BOLD)
    );
}

#[test]
fn table_numbers_are_right_aligned_and_long_cells_truncate() {
    let t = Theme::no_color();
    let columns = [
        Column::new("Session"),
        Column::new("Tokens").right(),
        Column::new("Cost").right(),
    ];
    let rows = [
        ["a", "12", "$0.42"],
        [LONG, "1,204,331", "$38.10"],
        ["b", "804", "$0.00"],
    ];
    for width in WIDTHS {
        let mut buf = Buffer::empty(Rect::new(0, 0, width, 6));
        Table::new(&t, &columns)
            .rows(&rows)
            .render(buf.area, &mut buf);
        let text = dump(&buf);
        let lines: Vec<&str> = text.lines().collect();
        let right_edge = |l: &str| ejm_tui::width(l.trim_end());
        // Header, rows and the widest number all end in the same column.
        assert!(
            lines[2..5]
                .iter()
                .all(|l| right_edge(l) == right_edge(lines[0])),
            "cost column drifts at {width}:\n{text}"
        );
        // The digits of each number column are flush right: every number ends where its header ends.
        let tokens_end = end_col(lines[0], "Tokens");
        for (line, number) in lines[2..5].iter().zip(["12", "1,204,331", "804"]) {
            let at = end_col(line, number);
            assert_eq!(at, tokens_end, "{number} is not right aligned at {width}");
        }
        if width == 40 {
            assert!(
                lines[3].contains('\u{2026}'),
                "long cell was not truncated with an ellipsis:\n{text}"
            );
        }
        assert!(
            lines
                .iter()
                .all(|l| ejm_tui::width(l) <= usize::from(width))
        );
    }
}

#[test]
fn table_drops_trailing_columns_before_it_wraps() {
    let t = Theme::no_color();
    let columns = [
        Column::new("Session"),
        Column::new("Model"),
        Column::new("Tokens").right(),
        Column::new("Cost").right(),
    ];
    let rows = [["fix-flaky-retry", "deepseek-chat", "12,480", "$0.42"]];
    let mut buf = Buffer::empty(Rect::new(0, 0, 12, 3));
    Table::new(&t, &columns)
        .rows(&rows)
        .render(buf.area, &mut buf);
    let out = dump(&buf);
    assert!(out.lines().all(|l| ejm_tui::width(l) <= 12), "{out}");
    assert!(
        out.contains("Se\u{2026}") && out.lines().count() == 3,
        "{out}"
    );
    assert!(!out.contains("Cost"), "{out}");
}

#[test]
fn row_keeps_its_state_marks_and_the_disabled_word_when_narrow() {
    let t = Theme::no_color();
    let row = |state, w: u16| {
        let mut buf = Buffer::empty(Rect::new(0, 0, w, 1));
        Row::new(&t, "deploy-production")
            .value("v1.4.2")
            .meta("2m ago")
            .state(state)
            .render(buf.area, &mut buf);
        dump(&buf)
    };
    assert_eq!(
        row(RowState::Default, 80),
        format!(
            "  deploy-production  v1.4.2{}2m ago",
            " ".repeat(80 - 2 - 17 - 8 - 6)
        )
    );
    assert!(row(RowState::Selected, 80).starts_with("\u{203a} deploy"));
    assert!(row(RowState::Focused, 80).starts_with("\u{25b8} deploy"));
    for w in 16..=40 {
        assert!(
            row(RowState::Disabled, w).contains("(disabled)"),
            "disabled word lost at width {w}: {}",
            row(RowState::Disabled, w)
        );
    }
    // Meta goes first, then the value, then the label is cut.
    assert!(
        !row(RowState::Default, 28).contains("2m ago")
            && row(RowState::Default, 28).contains("v1.4.2")
    );
    assert!(row(RowState::Default, 12).contains('\u{2026}'));
}

#[test]
fn control_characters_never_reach_the_buffer() {
    let t = Theme::no_color();
    let hostile = "\u{1b}[31mred\u{7}\u{1b}]0;title\u{7}\ttab\nline";
    let columns = [Column::new("A")];
    let rows = [[hostile]];
    let mut buf = Buffer::empty(Rect::new(0, 0, 60, 12));
    let at = |y, h| Rect::new(0, y, 60, h);
    Text::new(&t, hostile).render(at(0, 2), &mut buf);
    Row::new(&t, hostile)
        .value(hostile)
        .meta(hostile)
        .render(at(2, 1), &mut buf);
    Prompt::new(&t, hostile).render(at(3, 1), &mut buf);
    Status::new(&t, StatusLevel::Ok)
        .label(hostile)
        .render(at(4, 1), &mut buf);
    Table::new(&t, &columns)
        .rows(&rows)
        .render(at(5, 4), &mut buf);
    StateBlock::new(&t, StateKind::Error, hostile).render(at(9, 2), &mut buf);
    assert!(
        buf.content
            .iter()
            .all(|c| !c.symbol().chars().any(char::is_control)),
        "a control character reached the buffer"
    );
}

#[test]
fn code_rows_keep_content_and_fit_terminal_columns() {
    use ejm_tui::{CodeLanguage, code_lines, width};
    for columns in [2, 3, 40, 80, 200] {
        for (language, source) in [
            (CodeLanguage::Rust, "let s = \"界🦀e\u{301}\"; // result"),
            (CodeLanguage::Script, "const n = 42;"),
            (CodeLanguage::Python, "print(\"text\") # comment"),
            (CodeLanguage::Json, "{\"long-key\": false}"),
            (CodeLanguage::Shell, "echo $# \u{24}{#name} # count"),
            (CodeLanguage::Config, "url: https://example.com # link"),
            (CodeLanguage::Plain, "abcdefg 👨‍👩‍👧‍👦"),
            (CodeLanguage::Diff, "+added text with a long continuation"),
        ] {
            for (_, theme) in themes() {
                let lines = code_lines(&theme, language, source, columns);
                assert_eq!(
                    lines.iter().map(ToString::to_string).collect::<String>(),
                    source
                );
                assert!(
                    lines
                        .iter()
                        .all(|line| width(&line.to_string()) <= usize::from(columns))
                );
            }
        }
    }
    let lines = code_lines(&Theme::no_color(), CodeLanguage::Plain, "界🦀", 1);
    assert_eq!(
        lines.iter().map(ToString::to_string).collect::<Vec<_>>(),
        ["?", "?"]
    );
    let theme = Theme::new(ColorDepth::TrueColor, false);
    for columns in [40, 80, 200] {
        for (tag, source, token, style) in [
            ("rust", "fn f() {}", "fn", theme.syntax.keyword),
            ("tsx", "const n = 42;", "const", theme.syntax.keyword),
            ("python", "def f():", "def", theme.syntax.keyword),
            ("json", "{\"a\": 1}", "\"a\"", theme.syntax.string),
            ("bash", "if true; then", "if", theme.syntax.keyword),
            ("toml", "enabled = true", "true", theme.syntax.keyword),
        ] {
            let lines = code_lines(&theme, CodeLanguage::from_tag(tag), source, columns);
            assert!(
                lines
                    .iter()
                    .flat_map(|line| &line.spans)
                    .any(|span| span.content == token && span.style == style),
                "{tag} at {columns}"
            );
            assert!(
                lines
                    .iter()
                    .all(|line| width(&line.to_string()) <= usize::from(columns))
            );
        }
    }
    let theme = Theme::no_color();
    let line = code_lines(&theme, CodeLanguage::Rust, "let s = \"x\";", 80)
        .into_iter()
        .next()
        .expect("one line");
    assert!(
        line.spans
            .iter()
            .all(|span| span.style.fg.is_none() && span.style.bg.is_none())
    );
}

#[test]
fn markdown_never_paints_outside_its_area_or_emits_controls() {
    use ejm_tui::{Markdown, theme::ASCII};
    let source = "# Heading\n\nUse **bold** and \u{60}code\u{60}.\n\n- 界界 and 🦀\n  - nested\n\n> a quote\n\n\u{60}\u{60}\u{60}rust\nlet\tx = \"a\";\x1b[0m\n\n// line two\n\u{60}\u{60}\u{60}\n";
    let sentinel = Cell::new("#");
    for (mode, theme) in themes() {
        for theme in [theme, theme.with_glyphs(&ASCII)] {
            for columns in (0..=12).chain(WIDTHS) {
                let outside = Rect::new(0, 0, columns + 4, 40);
                let area = Rect::new(2, 1, columns, 38);
                let mut buffer = Buffer::filled(outside, sentinel.clone());
                let markdown = Markdown::new(&theme, source);
                let lines = markdown.lines(columns);
                assert!(
                    lines
                        .iter()
                        .all(|line| line.width() <= usize::from(columns))
                );
                assert!(
                    lines
                        .iter()
                        .all(|line| !line.to_string().chars().any(char::is_control))
                );
                markdown.render(area, &mut buffer);
                for y in 0..outside.height {
                    for x in 0..outside.width {
                        let cell = &buffer[(x, y)];
                        if !area.contains((x, y).into()) {
                            assert_eq!(cell, &sentinel, "{mode}, {columns}, ({x}, {y})");
                        } else if mode == "no_color" {
                            assert_eq!((cell.fg, cell.bg), (Color::Reset, Color::Reset));
                        } else {
                            assert_eq!(cell.bg, Color::Reset);
                        }
                    }
                }
            }
        }
    }
}
