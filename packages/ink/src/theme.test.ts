// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTheme, detectTheme, toAnsi256 } from "./theme";

const tty = { isTTY: true };
const utf8 = { LANG: "en_US.UTF-8" };

describe("detectTheme", () => {
  it("turns color off for NO_COLOR, even when FORCE_COLOR is set", () => {
    expect(detectTheme({ ...tty, env: { ...utf8, NO_COLOR: "1", COLORTERM: "truecolor" } }).level).toBe("none");
    expect(detectTheme({ ...tty, env: { ...utf8, NO_COLOR: "1", FORCE_COLOR: "3" } }).level).toBe("none");
  });
  it("ignores an empty NO_COLOR", () => {
    expect(detectTheme({ ...tty, env: { ...utf8, NO_COLOR: "", COLORTERM: "truecolor" } }).level).toBe("truecolor");
  });
  it("is plain, ASCII and colorless when output is not a TTY", () => {
    const t = detectTheme({ isTTY: false, env: utf8 });
    expect([t.level, t.unicode, t.animate]).toEqual(["none", false, false]);
  });
  it("picks the richest level the terminal announces", () => {
    expect(detectTheme({ ...tty, env: { ...utf8, COLORTERM: "24bit" } }).level).toBe("truecolor");
    expect(detectTheme({ ...tty, env: { ...utf8, TERM: "xterm-256color" } }).level).toBe("256");
    expect(detectTheme({ ...tty, env: { ...utf8, TERM: "xterm" } }).level).toBe("basic");
    expect(detectTheme({ ...tty, env: { ...utf8, TERM: "dumb" } }).level).toBe("none");
  });
  it("uses ASCII glyphs when the locale is not UTF-8 or plain mode is on", () => {
    expect(detectTheme({ ...tty, env: { LANG: "C" } }).unicode).toBe(false);
    expect(detectTheme({ ...tty, env: utf8 }).unicode).toBe(true);
    expect(detectTheme({ ...tty, env: { ...utf8, EJM_PLAIN: "1" } }).unicode).toBe(false);
  });
  it("reads light backgrounds from COLORFGBG and defaults to dark", () => {
    expect(detectTheme({ ...tty, env: { ...utf8, COLORFGBG: "0;15" } }).appearance).toBe("light");
    expect(detectTheme({ ...tty, env: { ...utf8, COLORFGBG: "15;0" } }).appearance).toBe("dark");
    expect(detectTheme({ ...tty, env: utf8 }).appearance).toBe("dark");
  });
});

describe("createTheme colors", () => {
  it("takes truecolor values from the generated theme for each appearance", () => {
    expect(createTheme({ level: "truecolor", appearance: "dark" }).color("error")).toBe("#EEA0A0");
    expect(createTheme({ level: "truecolor", appearance: "light" }).color("error")).toBe("#A63A3A");
    expect(createTheme({ level: "truecolor" }).color("accent")).toBe("#B8C6AA");
  });
  it("returns nothing for plain text and for NO_COLOR", () => {
    expect(createTheme({ level: "truecolor" }).color(undefined)).toBeUndefined();
    expect(createTheme({ level: "none" }).color("error")).toBeUndefined();
  });
  it("maps hex to the xterm 256 palette", () => {
    expect(toAnsi256("#000000")).toBe(16);
    expect(toAnsi256("#FF0000")).toBe(196);
    expect(toAnsi256("#808080")).toBe(244);
    expect(createTheme({ level: "256" }).color("error")).toMatch(/^ansi256\(\d+\)$/);
  });
  it("uses named 16 colors at the basic level", () => {
    expect(createTheme({ level: "basic" }).color("success")).toBe("green");
  });
});
