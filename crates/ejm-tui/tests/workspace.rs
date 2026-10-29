//! Workspace fitting, input space and color-independent state contracts.
use ejm_tui::{
    ActivityLine, ResourceCount, ResourceLine, SessionHeader, Theme, WorkspaceLayout, worker_line,
    workspace_controls,
};
use ratatui::{layout::Rect, style::Color};

#[test]
fn workspace_keeps_input_and_transcript_with_bounded_chrome() {
    for (height, worker_rows) in [(13, 0), (14, 1)] {
        let layout = WorkspaceLayout::new(Rect::new(0, 0, 40, height), 6, true, true, 0);
        assert_eq!(layout.composer.height, 7, "preserve all six draft rows");
        assert_eq!(layout.workers.height, worker_rows);
    }
    for height in [8, 9, 12, 24, 40] {
        for active in [false, true] {
            let area = Rect::new(3, 2, 40, height);
            let layout = WorkspaceLayout::new(area, usize::MAX, true, active, usize::MAX);
            assert!(layout.transcript.height >= 1);
            assert!(layout.composer.height >= 2);
            assert_eq!(layout.controls.height, 1);
            assert_eq!(layout.header.height, 1);
            // A blank row separates the header from the conversation.
            assert_eq!(layout.transcript.y, layout.header.bottom() + 1);
            // And another sets the controls apart from the draft.
            assert_eq!(layout.controls.y, layout.composer.bottom() + 1);
            assert!(layout.notices.height <= 4);
            let regions = [
                layout.header,
                layout.transcript,
                layout.workers,
                layout.activity,
                layout.notices,
                layout.composer,
                layout.controls,
            ];
            let mut bottom = area.y;
            for region in regions {
                assert!(region.y >= bottom);
                assert!(region.bottom() <= area.bottom());
                bottom = region.bottom();
            }
        }
    }
}

#[test]
fn recipes_fit_and_remain_meaningful_without_color() {
    let theme = Theme::no_color();
    let resources = ResourceLine {
        agents: 12,
        models: ResourceCount {
            active: 2,
            queued: 3,
        },
        tools: ResourceCount::default(),
    };
    for columns in [0, 1, 20, 40, 80, 120] {
        let header = SessionHeader {
            name: "ejm-cli",
            version: "0.1.0",
            connection: "Provider / model",
            directory: "/long/directory/世界",
        }
        .line(&theme, columns);
        let activity = ActivityLine {
            label: "Stopping",
            active: true,
            details: &["step 2", "14s", "Esc to stop"],
            spin: None,
        }
        .line(&theme, columns);
        let count = resources.line(&theme, columns);
        let controls = workspace_controls(
            &theme,
            "write",
            true,
            &[("Ctrl+C", "stop"), ("Ctrl+K", "steer")],
            columns,
        );
        let worker = worker_line(
            &theme,
            "Investigate a very long failure 世界",
            "failed",
            true,
            columns,
        );
        for line in [&header, &activity, &count, &controls, &worker] {
            assert!(line.width() <= usize::from(columns), "{columns}: {line}");
            assert!(
                line.spans
                    .iter()
                    .all(|s| s.style.fg.is_none_or(|fg| fg == Color::Reset))
            );
        }
        if columns >= 50 {
            assert_eq!(
                count.to_string(),
                "12 agents · 2 model calls, 3 waiting · 0 tools"
            );
        } else if columns >= 40 {
            assert!(count.to_string().contains("models 2+3q"));
        }
        if columns >= 80 {
            let text = header.to_string();
            assert!(
                text.starts_with("ejm-cli 0.1.0  Provider / model"),
                "{text}"
            );
            assert!(text.ends_with("/long/directory/世界"), "{text}");
        }
        if columns >= 40 {
            assert!(worker.to_string().contains("failed"));
            assert!(controls.to_string().contains("write"));
            assert!(controls.to_string().contains("Ctrl+C stop"));
            assert!(controls.to_string().starts_with("write "));
            assert!(controls.to_string().ends_with("Ctrl+K steer"), "{controls}");
            assert_eq!(controls.width(), usize::from(columns));
        }
    }
}

#[test]
fn idle_resources_draw_nothing() {
    let idle = ResourceLine::default();
    assert!(idle.is_idle());
    assert_eq!(idle.line(&Theme::no_color(), 80).width(), 0);
    let queued = ResourceLine {
        tools: ResourceCount {
            active: 0,
            queued: 1,
        },
        ..ResourceLine::default()
    };
    assert!(!queued.is_idle());
    assert_eq!(
        queued.line(&Theme::no_color(), 80).to_string(),
        "0 agents · 0 model calls · 0 tools, 1 waiting"
    );
}
