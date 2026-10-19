//! Renders every primitive and state in dark, light and `NO_COLOR`, for visual review.
//!
//! ```text
//! cargo run --example showcase                 text dump of all three modes at 80 columns
//! cargo run --example showcase -- 40 ascii     width 40, ASCII glyphs
//! cargo run --example showcase -- 80 --ansi    the same with real colors, for a terminal
//! ```

use std::fmt::Write as _;

use ejm_tui::{
    Action, Appearance, Callout, CalloutKind, ColorDepth, Column, KeyHints, Prompt, PromptState,
    Row, RowState, Rule, Stat, StatState, StateBlock, StateKind, Status, StatusLevel, Table,
    TableState, Text, TextVariant, Theme, theme,
};
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::{Color, Modifier};
use ratatui::widgets::Widget;

/// A tall buffer that widgets are stacked down, one section after another.
struct Page {
    buf: Buffer,
    y: u16,
    width: u16,
}

impl Page {
    fn new(width: u16) -> Self {
        Self {
            buf: Buffer::empty(Rect::new(0, 0, width, 400)),
            y: 0,
            width,
        }
    }

    /// Draw `widget` in `h` rows, then move down.
    fn put(&mut self, h: u16, widget: impl Widget) {
        widget.render(Rect::new(0, self.y, self.width, h), &mut self.buf);
        self.y += h;
    }

    fn heading(&mut self, t: &Theme, title: &str) {
        self.put(1, Rule::new(t).label(title));
    }

    fn space(&mut self) {
        self.y += 1;
    }
}

fn text_section(t: &Theme, page: &mut Page) {
    page.heading(t, "Text");
    for (variant, name) in [
        (TextVariant::Default, "default"),
        (TextVariant::Muted, "muted"),
        (TextVariant::Strong, "strong"),
        (TextVariant::Code, "code"),
    ] {
        let body = format!("{name}: The quick brown fox jumps over the lazy dog.");
        let text = Text::new(t, &body).variant(variant);
        page.put(text.height(page.width), text);
    }
    page.space();
}

fn row_status_stat(t: &Theme, page: &mut Page) {
    page.heading(t, "Row");
    for state in [
        RowState::Default,
        RowState::Selected,
        RowState::Focused,
        RowState::Disabled,
    ] {
        page.put(
            1,
            Row::new(t, "fix-flaky-retry")
                .value("3 files")
                .meta("2m ago")
                .state(state)
                .label_width(18),
        );
    }
    page.space();
    page.heading(t, "Status");
    for level in [
        StatusLevel::Ok,
        StatusLevel::Warn,
        StatusLevel::Error,
        StatusLevel::Info,
        StatusLevel::Pending,
    ] {
        page.put(1, Status::new(t, level));
    }
    page.space();
    page.heading(t, "Stat");
    for state in [
        StatState::Default,
        StatState::Loading,
        StatState::Error,
        StatState::Empty,
    ] {
        page.put(
            Stat::HEIGHT,
            Stat::new(t, "Sessions this week")
                .figure("128")
                .state(state),
        );
    }
    page.space();
}

fn table_section(t: &Theme, page: &mut Page) {
    let columns = [
        Column::new("Session"),
        Column::new("Model"),
        Column::new("Tokens").right(),
        Column::new("Cost").right(),
    ];
    let rows = [
        ["fix-flaky-retry", "deepseek-chat", "12,480", "$0.42"],
        ["port-theme-to-rust", "local-qwen", "804", "$0.00"],
        [
            "a-very-long-session-name-that-must-truncate",
            "deepseek-reasoner",
            "1,204,331",
            "$38.10",
        ],
    ];
    page.heading(t, "Table");
    for state in [
        TableState::Default,
        TableState::Empty,
        TableState::Loading,
        TableState::Error,
    ] {
        let table = Table::new(t, &columns).state(state);
        let table = match state {
            TableState::Default => table.rows(&rows),
            TableState::Empty => table.action(Action::new("New session").key("n")),
            _ => table,
        };
        page.put(table.height(page.width), table);
        page.space();
    }
}

fn prompt_hints_callout_state(t: &Theme, page: &mut Page) {
    page.heading(t, "Prompt");
    let spin = t.spinner(160, false);
    let typed = "refactor the retry loop";
    for (state, value) in [
        (PromptState::Idle, typed),
        (PromptState::Idle, ""),
        (PromptState::Busy, typed),
        (PromptState::Error, typed),
    ] {
        let prompt = Prompt::new(t, value)
            .placeholder("Describe a task")
            .state(state)
            .spin(spin);
        let prompt = match state {
            PromptState::Error => {
                prompt.message("The provider key is missing. Run login, then try again.")
            }
            _ => prompt,
        };
        page.put(prompt.height(page.width), prompt);
    }
    page.space();
    page.heading(t, "KeyHints");
    page.put(
        1,
        KeyHints::new(
            t,
            &[
                ("Enter", "send"),
                ("Ctrl+C", "stop"),
                ("Ctrl+K", "steer"),
                ("Ctrl+S", "sessions"),
            ],
        ),
    );
    page.space();
    page.heading(t, "Callout");
    for kind in [CalloutKind::Note, CalloutKind::Tip, CalloutKind::Warning] {
        let callout = Callout::new(
            t,
            kind,
            "Shell access is on for this session. Tool calls can change files.",
        );
        page.put(callout.height(page.width), callout);
    }
    page.space();
    page.heading(t, "StateBlock");
    for kind in [StateKind::Empty, StateKind::Loading, StateKind::Error] {
        let block = StateBlock::new(
            t,
            kind,
            "No sessions yet. Sessions you start are listed here.",
        )
        .action(Action::new("New session").key("Enter"));
        page.put(block.height(page.width), block);
        page.space();
    }
}

fn gallery(t: &Theme, width: u16) -> Page {
    let mut page = Page::new(width);
    text_section(t, &mut page);
    row_status_stat(t, &mut page);
    table_section(t, &mut page);
    prompt_hints_callout_state(t, &mut page);
    page
}

/// The rows as text. The cell after a wide character is skipped, as a terminal does.
fn text_dump(page: &Page) -> String {
    (0..page.y)
        .map(|y| {
            let (mut row, mut x) = (String::new(), 0);
            while x < page.width {
                let symbol = page.buf[(x, y)].symbol();
                row.push_str(symbol);
                x += u16::try_from(ejm_tui::width(symbol).max(1)).unwrap_or(1);
            }
            row.trim_end().to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn color_code(color: Color) -> String {
    match color {
        Color::Rgb(r, g, b) => format!("38;2;{r};{g};{b}"),
        Color::Indexed(i) => format!("38;5;{i}"),
        other => {
            let names = [
                "Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "Gray", "DarkGray",
            ];
            let at = names
                .iter()
                .position(|n| format!("{other:?}") == *n)
                .unwrap_or(7);
            // 30..37 are the normal colors, 90 is bright black.
            if at == 8 {
                "90".to_string()
            } else {
                format!("{}", 30 + at)
            }
        }
    }
}

/// The rows with ANSI color codes, for a real terminal.
fn ansi_dump(page: &Page) -> String {
    let mut out = String::new();
    for y in 0..page.y {
        for x in 0..page.width {
            let cell = &page.buf[(x, y)];
            let mut codes = vec!["0".to_string()];
            if cell.fg != Color::Reset {
                codes.push(color_code(cell.fg));
            }
            if cell.modifier.contains(Modifier::BOLD) {
                codes.push("1".into());
            }
            let _ = write!(out, "\x1b[{}m{}", codes.join(";"), cell.symbol());
        }
        out.push_str("\x1b[0m\n");
    }
    out
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let width = args.iter().find_map(|a| a.parse().ok()).unwrap_or(80);
    let ansi = args.iter().any(|a| a == "--ansi");
    let ascii = args.iter().any(|a| a == "ascii");
    let modes = [
        ("dark", Theme::new(ColorDepth::TrueColor, false)),
        ("light", Theme::new(ColorDepth::TrueColor, true)),
        (
            "NO_COLOR",
            Theme::detect(true, Appearance::Auto, None, Some("truecolor"), None),
        ),
    ];
    for (name, theme) in modes {
        let theme = if ascii {
            theme.with_glyphs(&theme::ASCII)
        } else {
            theme
        };
        let page = gallery(&theme, width);
        println!(
            "=== {name}, {width} columns{} ===",
            if ascii { ", ascii" } else { "" }
        );
        println!(
            "{}",
            if ansi {
                ansi_dump(&page)
            } else {
                text_dump(&page)
            }
        );
    }
}
