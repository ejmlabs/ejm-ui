// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CommandMenu, Markdown, Message, ToolCall } from "./index";
import { show } from "./support";

const output = Array.from({ length: 10 }, (_, i) => `${i + 1}: line`).join("\n");

describe("ToolCall", () => {
  it("collapses long output to a preview with a count and the host's expand key", () => {
    const out = show(<ToolCall state="done" name="read_file" detail="src/main.rs" output={output} expandKey="Ctrl+O" />).split("\n");
    expect(out[0]).toBe("✓ read_file  src/main.rs");
    expect(out[1]).toBe("  └ 1: line");
    expect(out).toContain("    … +6 lines (Ctrl+O to expand)");
    expect(out).not.toContain("    5: line");
  });

  it("shows every line when expanded and more lines when failed", () => {
    const expanded = show(<ToolCall state="done" name="t" output={output} expanded />);
    expect(expanded).toContain("10: line");
    expect(expanded).not.toContain("+");
    expect(show(<ToolCall state="failed" name="t" output={output} />)).toContain("… +2 lines");
  });

  it("names a call with no output and hides output while running", () => {
    expect(show(<ToolCall state="done" name="t" output="" />)).toBe("✓ t\n  └ no output");
    expect(show(<ToolCall state="running" name="t" output={output} spin="⠙" />)).toBe("⠙ t  running…");
  });
});

describe("Markdown", () => {
  it("draws structure without its markup", () => {
    const out = show(<Markdown text={"## Plan\n\nUse **clap** and `args.rs`.\n- first item\n1. step one\n```rust\nfn main() {}\n```"} />).split("\n");
    expect(out).toEqual(["Plan", "", "Use clap and args.rs.", "• first item", "1. step one", "  fn main() {}"]);
  });

  it("leaves unclosed markup literal while streaming", () => {
    expect(show(<Markdown text="a **partial and `open" />)).toBe("a **partial and `open");
  });
});

describe("Message", () => {
  it("wraps under a hanging indent with the role's gutter glyph", () => {
    const out = show(<Message kind="user" text="alpha beta gamma delta epsilon" />, { columns: 12 }).split("\n");
    expect(out[0]).toBe("› alpha beta");
    expect(out.slice(1).every((l) => l.startsWith("  "))).toBe(true);
  });

  it("puts a notice title before its text", () => {
    expect(show(<Message kind="notice" text="go left" title="steering" />)).toBe("! steering: go left");
  });

  it("removes escape sequences from untrusted text", () => {
    expect(show(<Message kind="error" text={"bad\u001b]52;c;x\u0007 thing"} />)).not.toMatch(/\u001b/);
  });
});

describe("CommandMenu", () => {
  it("aligns usage and marks the selection", () => {
    const out = show(<CommandMenu items={[{ usage: "/help", description: "Show commands" }, { usage: "/steer MESSAGE", description: "Direct the run" }]} selected={1} />);
    expect(out.split("\n")).toEqual(["  /help           Show commands", "› /steer MESSAGE  Direct the run"]);
  });

  it("lets one long usage move only its own description", () => {
    const items = [
      { usage: "/help", description: "Show commands" },
      { usage: "/remote share [view|control]|status|stop", description: "Share this session" },
      { usage: "/resume ID", description: "Open a session" },
    ];
    const out = show(<CommandMenu items={items} />, { columns: 100 });
    expect(out.split("\n")).toEqual([
      "› /help       Show commands",
      "  /remote share [view|control]|status|stop  Share this session",
      "  /resume ID  Open a session",
    ]);
  });

  it("scrolls to keep the selection visible", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ usage: `/c${i}`, description: "d" }));
    const out = show(<CommandMenu items={items} selected={5} rows={2} />);
    expect(out).toContain("› /c5");
    expect(out).not.toContain("/c0");
  });
});
