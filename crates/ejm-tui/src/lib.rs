//! ejmlabs terminal components for ratatui.
//!
//! The same primitives and states as the web and Ink targets, from one contract
//! (`packages/core/contract.json`) and one generated theme (`packages/tokens/theme.json`).
//! Everything is containerless: groups are separated by space and a single hairline [`Rule`],
//! never by box-drawing frames. Every state is named by a word, a glyph or both, so each one reads
//! under `NO_COLOR` and in plain ASCII.
//!
//! | Component | States |
//! | --- | --- |
//! | [`Text`] | `default` (variants: default, muted, strong, code) |
//! | [`Rule`] | `default` |
//! | [`Row`] | default, selected, disabled, focused |
//! | [`Status`] | ok, warn, error, info, pending |
//! | [`Stat`] | default, loading, error, empty |
//! | [`Table`] | default, empty, loading, error |
//! | [`Prompt`] | idle, busy, error |
//! | [`KeyHints`] | `default` |
//! | [`Callout`] | note, tip, warning |
//! | [`StateBlock`] | empty, loading, error |
//!
//! Build a [`Theme`] once, then borrow it in each widget:
//!
//! ```
//! use ejm_tui::{Appearance, Row, RowState, Status, StatusLevel, Theme};
//! use ratatui::{buffer::Buffer, layout::Rect, widgets::Widget};
//!
//! let theme = Theme::from_env(false, Appearance::Auto, false);
//! let area = Rect::new(0, 0, 40, 2);
//! let mut buf = Buffer::empty(area);
//! Row::new(&theme, "main").value("3 ahead").state(RowState::Selected).render(Rect::new(0, 0, 40, 1), &mut buf);
//! Status::new(&theme, StatusLevel::Ok).render(Rect::new(0, 1, 40, 1), &mut buf);
//! ```
//!
//! Text that comes from the network, tools or files may be passed to any widget as is: control
//! characters are removed before drawing. Widths are terminal columns, counted with
//! `unicode-width`.

#![forbid(unsafe_code)]

mod callout;
mod fit;
mod hints;
mod prompt;
mod row;
mod stat;
mod state;
mod status;
mod style;
mod table;
mod text;
/// The generated palettes and glyph tables. Do not edit: run `node scripts/sync-rust-theme.mjs`.
#[allow(missing_docs, reason = "generated file, documented by the generator's banner")]
#[rustfmt::skip]
pub mod theme;

pub use callout::{Callout, CalloutKind};
pub use fit::{pad_left, pad_right, truncate, truncate_start, width};
pub use hints::KeyHints;
pub use prompt::{Prompt, PromptState};
pub use row::{Row, RowState};
pub use stat::{Stat, StatState};
pub use state::{Action, StateBlock, StateKind};
pub use status::{Status, StatusLevel};
pub use style::{
    ASCII_MARKS, Appearance, ColorDepth, Marks, Theme, UNICODE_MARKS, color_depth, glyph_set,
    glyphs_from_env, is_ascii, is_light, is_utf8_locale, pick_locale, spinner_frame,
};
pub use table::{Align, Column, Table, TableState};
pub use text::{Rule, Text, TextVariant};

use std::collections::BTreeMap;

use strum::IntoEnumIterator;

/// Every component and its states, as `{ "Component": ["state", ...] }`. Built from the state enums,
/// so a new variant appears here without anyone editing a list. The parity script compares this
/// (as `catalog.json`) with `packages/core/contract.json`.
#[must_use]
pub fn catalog() -> BTreeMap<&'static str, Vec<&'static str>> {
    fn names<S: IntoEnumIterator + Into<&'static str>>() -> Vec<&'static str> {
        S::iter().map(Into::into).collect()
    }
    // Text, Rule and KeyHints have one state. Text's variants are a prop, not states.
    BTreeMap::from([
        ("Text", vec!["default"]),
        ("Rule", vec!["default"]),
        ("Row", names::<RowState>()),
        ("Status", names::<StatusLevel>()),
        ("Stat", names::<StatState>()),
        ("Table", names::<TableState>()),
        ("Prompt", names::<PromptState>()),
        ("KeyHints", vec!["default"]),
        ("Callout", names::<CalloutKind>()),
        ("StateBlock", names::<StateKind>()),
    ])
}
