// @vitest-environment node
import { describe, expect, it } from "vitest";
import { alignNumbers, displayWidth, fitCell, formatBytes, formatDuration, formatNumber, formatRelativeTime, truncate } from "./index";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"], [999, "999 B"], [1000, "1 kB"], [1536, "1.5 kB"], [15_000, "15 kB"],
    [999_999, "1 MB"], [2_500_000_000, "2.5 GB"], [-5, "0 B"], [NaN, "0 B"],
  ])("%s -> %s", (n, out) => expect(formatBytes(n)).toBe(out));
});

describe("formatDuration", () => {
  it.each([
    [0, "0ms"], [850, "850ms"], [1200, "1.2s"], [59_000, "59s"], [125_000, "2m 5s"],
    [3_600_000, "1h"], [3_780_000, "1h 3m"], [93_600_000, "1d 2h"], [-1, "0ms"],
  ])("%s -> %s", (n, out) => expect(formatDuration(n)).toBe(out));
});

describe("formatRelativeTime", () => {
  const now = 1_700_000_000_000;
  it.each([
    [0, "just now"], [-60_000, "1m ago"], [-5 * 60_000, "5m ago"], [-3 * 3_600_000, "3h ago"],
    [-2 * 86_400_000, "2d ago"], [-21 * 86_400_000, "3w ago"], [-400 * 86_400_000, "1y ago"], [2 * 86_400_000, "in 2d"],
  ])("%s -> %s", (delta, out) => expect(formatRelativeTime(now + delta, now)).toBe(out));
});

describe("columns", () => {
  it("formats numbers with separators and fixed decimals", () => {
    expect(formatNumber(1234567.891, 1)).toBe("1,234,567.9");
    expect(formatNumber(NaN)).toBe("-");
  });
  it("counts wide characters as two columns", () => {
    expect(displayWidth("abc")).toBe(3);
    expect(displayWidth("日本")).toBe(4);
    expect(displayWidth("é")).toBe(1);
  });
  it("truncates to the width with an ellipsis and never overflows", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
    expect(truncate("hello", 8)).toBe("hello");
    expect(truncate("日本語テキスト", 7)).toBe("日本語…");
    for (const w of [1, 2, 5, 40]) expect(displayWidth(truncate("x".repeat(100), w))).toBeLessThanOrEqual(w);
    expect(truncate("abc", 0)).toBe("");
  });
  it("fits cells to an exact width, right aligned for numbers", () => {
    expect(fitCell("42", 5, "right")).toBe("   42");
    expect(fitCell("ab", 5)).toBe("ab   ");
    expect(fitCell("abcdefgh", 5, "right")).toBe("abcd…");
  });
  it("aligns numbers on their right edge", () => {
    expect(alignNumbers(["1.50", "10.25", "100.00"])).toEqual(["  1.50", " 10.25", "100.00"]);
  });
});
