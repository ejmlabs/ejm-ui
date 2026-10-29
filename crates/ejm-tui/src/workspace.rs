//! Fixed terminal workspace recipes. Hosts supply state, never visual tuning.

use crate::{KeyHints, Row, RowState, Theme, truncate, truncate_start, width};
use ratatui::{
    layout::{Constraint, Layout, Rect},
    text::{Line, Span},
};

/// Regions of a conversation workspace, in reading order.
#[derive(Clone, Copy, Debug)]
pub struct WorkspaceLayout {
    /// One line of application, connection and directory identity, followed by a blank row.
    pub header: Rect,
    /// Remaining space for the conversation.
    pub transcript: Rect,
    /// Optional bounded worker strip.
    pub workers: Rect,
    /// Current work, stopping or scrollback state. Hosts right-align [`ResourceLine`] here.
    pub activity: Rect,
    /// Optional host notices, at most four rows.
    pub notices: Rect,
    /// Draft and its hairline rule.
    pub composer: Rect,
    /// Effective grants and contextual controls, after a blank row.
    pub controls: Rect,
}

impl WorkspaceLayout {
    /// Allocate bounded chrome first, keeping at least one transcript row at supported sizes.
    #[must_use]
    pub fn new(
        area: Rect,
        draft_rows: usize,
        workers: bool,
        activity: bool,
        notices: usize,
    ) -> Self {
        let requested_draft = u16::try_from(draft_rows).unwrap_or(u16::MAX).clamp(1, 6);
        let workers = workers && area.height >= 7 + u16::from(activity) + requested_draft;
        // Header, its blank row, a transcript row, the rule, a draft row, the blank row above
        // the controls and the controls.
        let fixed = 7 + u16::from(workers) + u16::from(activity);
        let available = area.height.saturating_sub(fixed);
        let draft = requested_draft.min(available.saturating_add(1));
        let notices = u16::try_from(notices)
            .unwrap_or(4)
            .min(4)
            .min(available.saturating_sub(draft.saturating_sub(1)));
        let [
            header,
            _,
            transcript,
            workers,
            activity,
            notices,
            composer,
            _,
            controls,
        ] = Layout::vertical([
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Min(1),
            Constraint::Length(u16::from(workers)),
            Constraint::Length(u16::from(activity)),
            Constraint::Length(notices),
            Constraint::Length(draft + 1),
            Constraint::Length(1),
            Constraint::Length(1),
        ])
        .areas(area);
        Self {
            header,
            transcript,
            workers,
            activity,
            notices,
            composer,
            controls,
        }
    }
}

/// A one-line identity. Full connection details remain the host's inspectable state.
#[derive(Clone, Copy, Debug)]
pub struct SessionHeader<'a> {
    /// Product name or short mark and name.
    pub name: &'a str,
    /// Product version.
    pub version: &'a str,
    /// Effective connection, model or unavailable state.
    pub connection: &'a str,
    /// Current workspace directory.
    pub directory: &'a str,
}

impl SessionHeader<'_> {
    /// `name version  connection` from the first column, with the directory at the right edge,
    /// cut from its start so the part that matters stays. The directory drops first, then the
    /// connection is cut.
    #[must_use]
    pub fn line(&self, theme: &Theme, columns: u16) -> Line<'static> {
        let ell = theme.glyphs.ellipsis;
        let name = truncate(self.name, usize::from(columns), ell);
        let mut room = usize::from(columns) - width(&name);
        let mut spans = vec![Span::styled(name, theme.strong)];
        for (text, gap, style) in [
            (self.version, 1, theme.muted),
            (self.connection, 2, theme.text),
        ] {
            if text.is_empty() || room <= gap {
                continue;
            }
            let text = truncate(text, room - gap, ell);
            room -= gap + width(&text);
            spans.push(Span::styled(format!("{}{text}", " ".repeat(gap)), style));
        }
        // Too little room for a useful part of the path drops it.
        if room >= 2 + 8 {
            let directory = truncate_start(self.directory, room - 2, ell);
            spans.push(Span::styled(
                format!("{}{directory}", " ".repeat(room - width(&directory))),
                theme.muted,
            ));
        }
        Line::from(spans)
    }
}

/// Current activity, separate from resource counters.
#[derive(Clone, Copy, Debug, Default)]
pub struct ActivityLine<'a> {
    /// Meaningful status text, including unavailable or stopping states.
    pub label: &'a str,
    /// True for active work or cancellation in progress.
    pub active: bool,
    /// Muted facts after the label while active, such as the step, the elapsed time from
    /// [`elapsed_text`] and the stop key: `["step 2", "14s", "Esc to stop"]`.
    pub details: &'a [&'a str],
    /// The spinner frame from [`Theme::spinner`]. The running mark when absent.
    pub spin: Option<&'a str>,
}

impl ActivityLine<'_> {
    /// A single bounded line: `⠋ Thinking… (step 2 · 14s · Esc to stop)` while active, the
    /// muted label when idle. Active work carries a glyph and a word as well as color.
    #[must_use]
    pub fn line(&self, theme: &Theme, columns: u16) -> Line<'static> {
        let ell = theme.glyphs.ellipsis;
        if !self.active {
            return Line::styled(
                truncate(&format!("  {}", self.label), usize::from(columns), ell),
                theme.muted,
            );
        }
        let mark = self.spin.unwrap_or(theme.glyphs.running);
        let mut parts = vec![
            (format!("{mark} "), theme.accent),
            (
                format!("{}{ell}", self.label),
                theme.accent.add_modifier(ratatui::style::Modifier::BOLD),
            ),
        ];
        let details: Vec<&str> = self
            .details
            .iter()
            .copied()
            .filter(|d| !d.is_empty())
            .collect();
        if !details.is_empty() {
            let sep = format!(" {} ", theme.glyphs.separator);
            parts.push((format!(" ({})", details.join(&sep)), theme.muted));
        }
        crate::fit::fit(parts, usize::from(columns), ell)
    }
}

/// Elapsed seconds as `42s`, `3m 05s` or `1h 02m`.
#[must_use]
pub fn elapsed_text(seconds: u64) -> String {
    match seconds {
        0..60 => format!("{seconds}s"),
        60..3600 => format!("{}m {:02}s", seconds / 60, seconds % 60),
        _ => format!("{}h {:02}m", seconds / 3600, seconds % 3600 / 60),
    }
}

/// A count such as tokens as `950`, `1.2k` or `3.4M`.
#[must_use]
pub fn compact_count(count: u64) -> String {
    let tenths = |unit: u64| {
        let scaled = (count * 10 + unit / 2) / unit;
        format!("{}.{}", scaled / 10, scaled % 10)
    };
    match count {
        0..1000 => count.to_string(),
        1000..1_000_000 => format!("{}k", tenths(1000)),
        _ => format!("{}M", tenths(1_000_000)),
    }
}

/// A running and queued resource count supplied by the host.
#[derive(Clone, Copy, Debug, Default)]
pub struct ResourceCount {
    /// Work currently admitted.
    pub active: usize,
    /// Work waiting for admission.
    pub queued: usize,
}

/// Separate agent, model and tool counts. No engine types are required. Draws nothing while every
/// count is zero, so an idle screen stays quiet.
#[derive(Clone, Copy, Debug, Default)]
pub struct ResourceLine {
    /// Active agents.
    pub agents: usize,
    /// Active and queued model requests.
    pub models: ResourceCount,
    /// Running and queued tools.
    pub tools: ResourceCount,
}

impl ResourceLine {
    /// True when nothing is active or queued.
    #[must_use]
    pub fn is_idle(&self) -> bool {
        self.agents == 0
            && self.models.active + self.models.queued + self.tools.active + self.tools.queued == 0
    }

    /// `2 agents · 1 model call, 3 waiting · 0 tools` when it fits; compact `A+Qq` counts at
    /// narrow sizes. Empty when idle.
    #[must_use]
    pub fn line(&self, theme: &Theme, columns: u16) -> Line<'static> {
        if self.is_idle() {
            return Line::default();
        }
        let sep = theme.glyphs.separator;
        let count = |n: usize, noun: &str, waiting: usize| {
            let plural = if n == 1 { "" } else { "s" };
            let waiting = if waiting > 0 {
                format!(", {waiting} waiting")
            } else {
                String::new()
            };
            format!("{n} {noun}{plural}{waiting}")
        };
        let normal = format!(
            "{} {sep} {} {sep} {}",
            count(self.agents, "agent", 0),
            count(self.models.active, "model call", self.models.queued),
            count(self.tools.active, "tool", self.tools.queued),
        );
        let text = if width(&normal) <= usize::from(columns) {
            normal
        } else {
            format!(
                "agents {}  models {}+{}q  tools {}+{}q",
                self.agents,
                self.models.active,
                self.models.queued,
                self.tools.active,
                self.tools.queued
            )
        };
        Line::styled(
            truncate(&text, usize::from(columns), theme.glyphs.ellipsis),
            theme.muted,
        )
    }
}

/// Effective grant mode at the left, controls in priority order at the right edge.
#[must_use]
pub fn workspace_controls(
    theme: &Theme,
    mode: &str,
    elevated: bool,
    hints: &[(&str, &str)],
    columns: u16,
) -> Line<'static> {
    let mode = truncate(mode, usize::from(columns), theme.glyphs.ellipsis);
    let mode_width = width(&mode);
    // At least a separator's width stays between the mode and the hints.
    let available = usize::from(columns).saturating_sub(mode_width + 3);
    let hints = KeyHints::new(theme, hints).line(u16::try_from(available).unwrap_or(u16::MAX));
    let mut spans = vec![Span::styled(
        mode,
        if elevated { theme.warn } else { theme.muted },
    )];
    if hints.width() > 0 {
        let gap = usize::from(columns).saturating_sub(mode_width + hints.width());
        spans.push(Span::raw(" ".repeat(gap)));
        spans.extend(hints.spans);
    }
    Line::from(spans)
}

/// One worker label using the shared selection and fitting rules.
#[must_use]
pub fn worker_line(
    theme: &Theme,
    title: &str,
    state: &str,
    selected: bool,
    columns: u16,
) -> Line<'static> {
    if columns < 2 {
        return Line::default();
    }
    let title_columns = usize::from(columns).saturating_sub(width(state) + 4);
    let title = truncate(title, title_columns, theme.glyphs.ellipsis);
    Row::new(theme, &title)
        .value(state)
        .state(if selected {
            RowState::Selected
        } else {
            RowState::Default
        })
        .line(columns)
}
