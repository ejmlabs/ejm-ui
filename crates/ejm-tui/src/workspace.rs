//! Fixed terminal workspace recipes. Hosts supply state, never visual tuning.

use crate::{KeyHints, Row, RowState, Theme, truncate, truncate_start, width};
use ratatui::{
    layout::{Constraint, Layout, Rect},
    text::{Line, Span},
};

/// Regions of a conversation workspace, in reading order.
#[derive(Clone, Copy, Debug)]
pub struct WorkspaceLayout {
    /// Compact application, connection and directory identity.
    pub header: Rect,
    /// Remaining space for the conversation.
    pub transcript: Rect,
    /// Optional bounded worker strip.
    pub workers: Rect,
    /// Current work, stopping or scrollback state.
    pub activity: Rect,
    /// Resource counts, including idle counts.
    pub resources: Rect,
    /// Optional host notices, at most four rows.
    pub notices: Rect,
    /// Draft and its hairline rule.
    pub composer: Rect,
    /// Effective grants and contextual controls.
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
        let fixed = 7 + u16::from(workers) + u16::from(activity);
        let available = area.height.saturating_sub(fixed);
        let draft = requested_draft.min(available.saturating_add(1));
        let notices = u16::try_from(notices)
            .unwrap_or(4)
            .min(4)
            .min(available.saturating_sub(draft.saturating_sub(1)));
        let [
            header,
            transcript,
            workers,
            activity,
            resources,
            notices,
            composer,
            controls,
        ] = Layout::vertical([
            Constraint::Length(2),
            Constraint::Min(1),
            Constraint::Length(u16::from(workers)),
            Constraint::Length(u16::from(activity)),
            Constraint::Length(1),
            Constraint::Length(notices),
            Constraint::Length(draft + 1),
            Constraint::Length(1),
        ])
        .areas(area);
        Self {
            header,
            transcript,
            workers,
            activity,
            resources,
            notices,
            composer,
            controls,
        }
    }
}

/// A two-line identity. Full connection details remain the host's inspectable state.
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
    /// Identity lines fitted to terminal columns without splitting graphemes.
    #[must_use]
    pub fn lines(&self, theme: &Theme, columns: u16) -> [Line<'static>; 2] {
        if columns < 2 {
            return [Line::default(), Line::default()];
        }
        let label = format!("{} {}", self.name, self.version);
        let first = Row::new(theme, &label).meta(self.connection).line(columns);
        let directory = truncate_start(
            self.directory,
            usize::from(columns).saturating_sub(2),
            theme.glyphs.ellipsis,
        );
        [first, Line::styled(format!("  {directory}"), theme.muted)]
    }
}

/// Current activity, separate from resource counters.
#[derive(Clone, Copy, Debug)]
pub struct ActivityLine<'a> {
    /// Meaningful status text, including unavailable or stopping states.
    pub label: &'a str,
    /// True for active work or cancellation in progress.
    pub active: bool,
}

impl ActivityLine<'_> {
    /// A single bounded line. Active work carries a glyph as well as color.
    #[must_use]
    pub fn line(&self, theme: &Theme, columns: u16) -> Line<'static> {
        let mark = if self.active {
            theme.glyphs.running
        } else {
            " "
        };
        let text = truncate(
            &format!("{mark} {}", self.label),
            usize::from(columns),
            theme.glyphs.ellipsis,
        );
        Line::styled(
            text,
            if self.active {
                theme.accent
            } else {
                theme.muted
            },
        )
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

/// Separate agent, model and tool counts. No engine types are required.
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
    /// Keep all three named resources when they fit; compact labels at narrow sizes.
    #[must_use]
    pub fn line(&self, theme: &Theme, columns: u16) -> Line<'static> {
        let sep = theme.glyphs.separator;
        let normal = format!(
            "{} agents {sep} models {}+{}q {sep} tools {}+{}q",
            self.agents,
            self.models.active,
            self.models.queued,
            self.tools.active,
            self.tools.queued
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

/// Effective grant mode followed by controls in priority order.
#[must_use]
pub fn workspace_controls(
    theme: &Theme,
    mode: &str,
    elevated: bool,
    hints: &[(&str, &str)],
    columns: u16,
) -> Line<'static> {
    let mode = truncate(mode, usize::from(columns), theme.glyphs.ellipsis);
    let sep = format!(" {} ", theme.glyphs.separator);
    let available = usize::from(columns).saturating_sub(width(&mode) + width(&sep));
    let hints = KeyHints::new(theme, hints).line(u16::try_from(available).unwrap_or(u16::MAX));
    let mut spans = vec![Span::styled(
        mode,
        if elevated { theme.warn } else { theme.muted },
    )];
    if hints.width() > 0 {
        spans.push(Span::styled(sep, theme.muted));
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
