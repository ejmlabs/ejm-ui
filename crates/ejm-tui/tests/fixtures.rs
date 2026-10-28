//! Cross-target fixtures: the conversation blocks must print the lines recorded in
//! `packages/core/terminal-fixtures.json`, which the Ink target checks too. Run with
//! `EJM_WRITE_FIXTURES=1` to record the current output after an intended change.

use ejm_tui::{CommandMenu, Message, MessageKind, Theme, ToolCall, ToolCallState, theme};
use ratatui::text::Line;
use serde_json::Value;
use strum::IntoEnumIterator;

const PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/core/terminal-fixtures.json"
);

fn pick<S: IntoEnumIterator + Into<&'static str> + Copy>(name: &str) -> S {
    S::iter()
        .find(|s| (*s).into() == name)
        .unwrap_or_else(|| panic!("no state {name}"))
}

fn plain(lines: &[Line<'_>]) -> Vec<String> {
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

fn render(case: &Value) -> Vec<String> {
    let s = |key: &str| case[key].as_str().unwrap_or("");
    let t = if s("glyphs") == "ascii" {
        Theme::no_color().with_glyphs(&theme::ASCII)
    } else {
        Theme::no_color()
    };
    let width = u16::try_from(case["width"].as_u64().expect("width")).expect("width fits");
    let lines = match s("component") {
        "Message" => {
            let message = Message::new(&t, pick::<MessageKind>(s("kind")), s("text"));
            match case["title"].as_str() {
                Some(title) => message.title(title).lines(width),
                None => message.lines(width),
            }
        }
        "ToolCall" => ToolCall::new(&t, pick::<ToolCallState>(s("state")), s("name"))
            .detail(s("detail"))
            .output(s("output"))
            .expanded(case["expanded"].as_bool().unwrap_or(false))
            .expand_key(s("expandKey"))
            .lines(width),
        "CommandMenu" => {
            let items: Vec<(String, String)> = case["items"]
                .as_array()
                .expect("items")
                .iter()
                .map(|pair| {
                    (
                        pair[0].as_str().expect("usage").to_owned(),
                        pair[1].as_str().expect("description").to_owned(),
                    )
                })
                .collect();
            let borrowed: Vec<(&str, &str)> = items
                .iter()
                .map(|(u, d)| (u.as_str(), d.as_str()))
                .collect();
            let selected = usize::try_from(case["selected"].as_u64().unwrap_or(0)).expect("index");
            CommandMenu::new(&t, &borrowed)
                .selected(selected)
                .lines(width)
        }
        other => panic!("no fixture renderer for {other}"),
    };
    plain(&lines)
}

#[test]
fn conversation_blocks_print_the_shared_fixture_lines() {
    let mut fixtures: Value =
        serde_json::from_str(&std::fs::read_to_string(PATH).expect("fixtures")).expect("json");
    let write = std::env::var_os("EJM_WRITE_FIXTURES").is_some();
    let cases = fixtures["cases"].as_array_mut().expect("cases");
    for case in cases.iter_mut() {
        let got = render(case);
        if write {
            case["expected"] = serde_json::json!(got);
        } else {
            let expected: Vec<String> =
                serde_json::from_value(case["expected"].clone()).expect("expected lines");
            assert_eq!(got, expected, "{case}");
        }
    }
    if write {
        let text = serde_json::to_string_pretty(&fixtures).expect("json") + "\n";
        std::fs::write(PATH, text).expect("write fixtures");
    }
}
