//! Text styles for every role, chosen from the terminal's color support and appearance.
//!
//! Terminal apps do not paint a background. The styles set a foreground color or a modifier and
//! nothing else, so the reader's own terminal colors stay underneath.
//!
//! Choosing styles, in this order, stopping at the first that applies:
//!
//! 1. `NO_COLOR` set to a non-empty value, `--no-color`, or `TERM=dumb`: no colors at all.
//!    Strong text, accent, warning and error are bold. Everything else is plain.
//! 2. `COLORTERM` contains `truecolor` or `24bit`: the generated palette, as is.
//! 3. `TERM` contains `256color`: the same palette, mapped to the nearest 256-color index.
//! 4. Otherwise: the named 16-color set from the generated theme.
//!
//! Light or dark comes from the `--appearance` flag, then from `COLORFGBG` (background index 7
//! or 9 to 15 is light), and defaults to dark.

use ratatui::style::{Color, Modifier, Style};

use crate::theme::{ASCII, BASIC_DARK, BASIC_LIGHT, DARK, Glyphs, LIGHT, Palette, UNICODE};

/// Which palette to prefer: from the terminal (`Auto`), or forced by a flag.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Appearance {
    /// Read `COLORFGBG`, then assume a dark terminal.
    #[default]
    Auto,
    /// Force the light palette.
    Light,
    /// Force the dark palette.
    Dark,
}

/// How many colors the terminal can show.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ColorDepth {
    /// No colors. Meaning is carried by glyphs, words and bold.
    None,
    /// The 16 named ANSI colors.
    Basic,
    /// The 256-color palette.
    Ansi256,
    /// 24-bit color.
    TrueColor,
}

/// Marks the generated `Glyphs` table does not have yet. Same unicode/ascii split.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Marks {
    /// The hairline character repeated by `Rule`.
    pub rule: &'static str,
    /// The text cursor drawn at the end of a `Prompt` value.
    pub cursor: &'static str,
    /// The mark of a focused row.
    pub focused: &'static str,
    /// The glyph of an empty state.
    pub empty: &'static str,
    /// The glyph of an info status.
    pub info: &'static str,
    /// Leads the first output line of a tool call.
    pub elbow: &'static str,
    /// Starts a Markdown list item.
    pub bullet: &'static str,
}

/// Marks for UTF-8 terminals.
pub const UNICODE_MARKS: Marks = Marks {
    rule: "\u{2500}",
    cursor: "\u{258c}",
    focused: "\u{25b8}",
    empty: "\u{2013}",
    info: "i",
    elbow: "\u{2514}",
    bullet: "\u{2022}",
};
/// Marks for ASCII-only output.
pub const ASCII_MARKS: Marks = Marks {
    rule: "-",
    cursor: "_",
    focused: "*",
    empty: "-",
    info: "i",
    elbow: "`-",
    bullet: "-",
};

/// A style for every syntax role of generated code highlighting. Filled from the generated
/// palette at truecolor and 256-color depth; at 16-color and no-color depth the roles collapse
/// to strong (keywords, types, macros), muted (comments) and plain (everything else), so code
/// still shows structure without a color the terminal cannot draw.
#[derive(Clone, Copy, Debug)]
pub struct SyntaxStyles {
    /// Comments.
    pub comment: Style,
    /// Keywords.
    pub keyword: Style,
    /// String literals.
    pub string: Style,
    /// Numeric literals.
    pub number: Style,
    /// Type names.
    pub ty: Style,
    /// Generic type parameters.
    pub type_parameter: Style,
    /// Function names.
    pub function: Style,
    /// Macro invocations.
    pub mac: Style,
    /// Function parameters.
    pub parameter: Style,
    /// Object properties.
    pub property: Style,
    /// Constants.
    pub constant: Style,
    /// Module and namespace paths.
    pub namespace: Style,
    /// Plain identifiers.
    pub identifier: Style,
    /// Punctuation and delimiters.
    pub delimiter: Style,
}

/// A style for every role, plus the glyph set the widgets print.
///
/// Build one with [`Theme::detect`] or [`Theme::from_env`], or pick a mode directly with
/// [`Theme::new`]. Widgets borrow it; build it once at startup.
#[derive(Clone, Copy, Debug)]
pub struct Theme {
    /// Body text: the terminal's own foreground.
    pub text: Style,
    /// Secondary text.
    pub muted: Style,
    /// Emphasis: bold.
    pub strong: Style,
    /// Code and identifiers: the quietest text role.
    pub code: Style,
    /// Brand accent: prompt, selection and key names.
    pub accent: Style,
    /// Success.
    pub ok: Style,
    /// Warnings and notices.
    pub warn: Style,
    /// Failures.
    pub error: Style,
    /// Information.
    pub info: Style,
    /// Work not started or not known.
    pub pending: Style,
    /// The hairline rule and the callout rule.
    pub rule: Style,
    /// Code highlighting roles, matching the generated palette's `syntax` set.
    pub syntax: SyntaxStyles,
    /// Symbols: unicode or ASCII.
    pub glyphs: &'static Glyphs,
    /// More symbols, matching `glyphs`.
    pub marks: &'static Marks,
}

struct Roles {
    muted: Style,
    code: Style,
    accent: Style,
    ok: Style,
    warn: Style,
    error: Style,
    info: Style,
    pending: Style,
    rule: Style,
    syntax: SyntaxStyles,
}

/// The collapsed syntax set for depths without enough colors: comments muted, keywords, types
/// and macros strong, everything else plain.
fn plain_syntax(muted: Style, strong: Style) -> SyntaxStyles {
    SyntaxStyles {
        comment: muted,
        keyword: strong,
        string: Style::default(),
        number: Style::default(),
        ty: strong,
        type_parameter: strong,
        function: Style::default(),
        mac: strong,
        parameter: Style::default(),
        property: Style::default(),
        constant: Style::default(),
        namespace: Style::default(),
        identifier: Style::default(),
        delimiter: Style::default(),
    }
}

/// The generated palette's syntax set, mapped to the terminal's depth.
fn palette_syntax(depth: ColorDepth, p: &Palette) -> SyntaxStyles {
    let fg = |c: Color| Style::default().fg(paint(depth, c));
    let s = &p.syntax;
    SyntaxStyles {
        comment: fg(s.comment),
        keyword: fg(s.keyword),
        string: fg(s.string),
        number: fg(s.number),
        ty: fg(s.ty),
        type_parameter: fg(s.type_parameter),
        function: fg(s.function),
        mac: fg(s.mac),
        parameter: fg(s.parameter),
        property: fg(s.property),
        constant: fg(s.constant),
        namespace: fg(s.namespace),
        identifier: fg(s.identifier),
        delimiter: fg(s.delimiter),
    }
}

impl Theme {
    /// Styles for a color depth and appearance, with unicode glyphs.
    #[must_use]
    pub fn new(depth: ColorDepth, light: bool) -> Self {
        let fg = |c: Color| Style::default().fg(c);
        let roles = match depth {
            ColorDepth::None => {
                let bold = Style::default().add_modifier(Modifier::BOLD);
                let plain = Style::default();
                Roles {
                    muted: plain,
                    code: plain,
                    accent: bold,
                    ok: plain,
                    warn: bold,
                    error: bold,
                    info: plain,
                    pending: plain,
                    rule: plain,
                    syntax: plain_syntax(plain, bold),
                }
            }
            ColorDepth::Basic => {
                let b = if light { &BASIC_LIGHT } else { &BASIC_DARK };
                Roles {
                    muted: fg(b.dim),
                    code: fg(b.dim),
                    accent: fg(b.accent),
                    ok: fg(b.success),
                    warn: fg(b.warning),
                    error: fg(b.error),
                    info: fg(if light { Color::Cyan } else { Color::Blue }),
                    pending: fg(b.dim),
                    rule: fg(b.dim),
                    // The spec keeps syntax to plain and bold at 16 colors: no extra color noise.
                    syntax: plain_syntax(
                        Style::default(),
                        Style::default().add_modifier(Modifier::BOLD),
                    ),
                }
            }
            ColorDepth::Ansi256 | ColorDepth::TrueColor => {
                let p: &Palette = if light { &LIGHT } else { &DARK };
                let fg = |c: Color| fg(paint(depth, c));
                Roles {
                    muted: fg(p.text_muted),
                    code: fg(p.dim),
                    accent: fg(p.accent),
                    ok: fg(p.success),
                    warn: fg(p.warning),
                    error: fg(p.error),
                    info: fg(p.hues[0]),
                    pending: fg(p.dim),
                    rule: fg(p.line),
                    syntax: palette_syntax(depth, p),
                }
            }
        };
        Self {
            text: Style::default(),
            muted: roles.muted,
            strong: Style::default().add_modifier(Modifier::BOLD),
            code: roles.code,
            accent: roles.accent,
            ok: roles.ok,
            warn: roles.warn,
            error: roles.error,
            info: roles.info,
            pending: roles.pending,
            rule: roles.rule,
            syntax: roles.syntax,
            glyphs: &UNICODE,
            marks: &UNICODE_MARKS,
        }
    }

    /// Choose styles from explicit inputs, in the module's documented order. `colorfgbg`,
    /// `colorterm` and `term` are the values of those environment variables.
    #[must_use]
    pub fn detect(
        no_color: bool,
        appearance: Appearance,
        colorfgbg: Option<&str>,
        colorterm: Option<&str>,
        term: Option<&str>,
    ) -> Self {
        Self::new(
            color_depth(no_color, colorterm, term),
            is_light(appearance, colorfgbg),
        )
    }

    /// [`Theme::detect`] reading the environment, plus the glyph set from the locale. `no_color_flag`
    /// is your `--no-color` flag, `plain` your `--plain` flag. `NO_COLOR` counts when it is not empty.
    #[must_use]
    pub fn from_env(no_color_flag: bool, appearance: Appearance, plain: bool) -> Self {
        let var = |name: &str| std::env::var(name).ok();
        let no_color = no_color_flag || var("NO_COLOR").is_some_and(|v| !v.is_empty());
        let theme = Self::detect(
            no_color,
            appearance,
            var("COLORFGBG").as_deref(),
            var("COLORTERM").as_deref(),
            var("TERM").as_deref(),
        );
        theme.with_glyphs(glyphs_from_env(plain))
    }

    /// No colors: glyphs, words and bold only.
    #[must_use]
    pub fn no_color() -> Self {
        Self::new(ColorDepth::None, false)
    }

    /// Use another glyph set. The marks follow it.
    #[must_use]
    pub fn with_glyphs(mut self, glyphs: &'static Glyphs) -> Self {
        self.marks = if is_ascii(glyphs) {
            &ASCII_MARKS
        } else {
            &UNICODE_MARKS
        };
        self.glyphs = glyphs;
        self
    }

    /// The spinner glyph for `elapsed_ms` at 80 ms per frame. With `reduced_motion` it is the
    /// static running glyph, so nothing moves.
    #[must_use]
    pub fn spinner(&self, elapsed_ms: u64, reduced_motion: bool) -> &'static str {
        spinner_frame(self.glyphs, elapsed_ms, reduced_motion)
    }
}

/// Map a palette color to the terminal's depth. Only the 256-color depth changes anything.
fn paint(depth: ColorDepth, color: Color) -> Color {
    match (depth, color) {
        (ColorDepth::Ansi256, Color::Rgb(r, g, b)) => Color::Indexed(ansi256(r, g, b)),
        _ => color,
    }
}

/// The nearest xterm 256-color index: the gray ramp for near-neutral colors, otherwise the 6x6x6
/// cube. The same rule as `toAnsi256` in `@ejm/ink`, so both terminal targets pick one index.
#[must_use]
pub fn ansi256(r: u8, g: u8, b: u8) -> u8 {
    let (r, g, b) = (f64::from(r), f64::from(g), f64::from(b));
    if r.max(g).max(b) - r.min(g).min(b) < 8.0 {
        let gray = (((r + g + b) / 3.0 - 8.0) / 10.0).round();
        return if gray < 0.0 {
            16
        } else if gray > 23.0 {
            231
        } else {
            // In 0..=23 here, so the cast cannot truncate.
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let step = gray as u8;
            232 + step
        };
    }
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let cube = |v: f64| (v / 255.0 * 5.0).round() as u8;
    16 + 36 * cube(r) + 6 * cube(g) + cube(b)
}

/// The color depth for these inputs. `NO_COLOR`, `--no-color` or `TERM=dumb` give [`ColorDepth::None`].
#[must_use]
pub fn color_depth(no_color: bool, colorterm: Option<&str>, term: Option<&str>) -> ColorDepth {
    if no_color || term == Some("dumb") {
        ColorDepth::None
    } else if colorterm.is_some_and(|v| v.contains("truecolor") || v.contains("24bit")) {
        ColorDepth::TrueColor
    } else if term.is_some_and(|v| v.contains("256color")) {
        ColorDepth::Ansi256
    } else {
        ColorDepth::Basic
    }
}

/// Light when forced, or when `COLORFGBG` ("fg;bg", ANSI indexes) has background 7 or 9 to 15.
#[must_use]
pub fn is_light(appearance: Appearance, colorfgbg: Option<&str>) -> bool {
    match appearance {
        Appearance::Light => true,
        Appearance::Dark => false,
        Appearance::Auto => colorfgbg
            .and_then(|value| value.rsplit(';').next())
            .and_then(|bg| bg.parse::<u8>().ok())
            .is_some_and(|bg| bg == 7 || (9..=15).contains(&bg)),
    }
}

/// UNICODE unless `plain` is set or the locale is not UTF-8. An unset locale counts as not UTF-8.
#[must_use]
pub fn glyph_set(plain: bool, locale: Option<&str>) -> &'static Glyphs {
    if !plain && locale.is_some_and(is_utf8_locale) {
        &UNICODE
    } else {
        &ASCII
    }
}

/// True when a locale string such as `en_US.UTF-8` or `C.utf8` names UTF-8.
#[must_use]
pub fn is_utf8_locale(locale: &str) -> bool {
    let l = locale.to_ascii_lowercase();
    l.contains("utf-8") || l.contains("utf8")
}

/// The first non-empty of `LC_ALL`, `LC_CTYPE`, `LANG`, which is the order libc uses.
#[must_use]
pub fn pick_locale<'a>(
    lc_all: Option<&'a str>,
    lc_ctype: Option<&'a str>,
    lang: Option<&'a str>,
) -> Option<&'a str> {
    [lc_all, lc_ctype, lang]
        .into_iter()
        .flatten()
        .find(|v| !v.is_empty())
}

/// [`glyph_set`] reading the locale from the environment. `plain` is your `--plain` flag.
#[must_use]
pub fn glyphs_from_env(plain: bool) -> &'static Glyphs {
    let var = |name: &str| std::env::var(name).ok();
    let (a, b, c) = (var("LC_ALL"), var("LC_CTYPE"), var("LANG"));
    glyph_set(plain, pick_locale(a.as_deref(), b.as_deref(), c.as_deref()))
}

/// True for the ASCII glyph set (compares the separator, which differs between the sets).
#[must_use]
pub fn is_ascii(g: &Glyphs) -> bool {
    g.separator == ASCII.separator
}

/// Spinner glyph for `elapsed_ms`, 80 ms per frame. Reduced motion returns the static running glyph.
#[must_use]
pub fn spinner_frame(g: &Glyphs, elapsed_ms: u64, reduced_motion: bool) -> &'static str {
    if reduced_motion {
        return g.running;
    }
    g.spinner[usize::try_from(elapsed_ms / 80).unwrap_or(0) % g.spinner.len()]
}

#[cfg(test)]
mod tests {

    #[test]
    fn ansi256_matches_the_ink_target() {
        // Expected indexes from `toAnsi256` in packages/ink/src/theme.ts.
        for (hex, index) in [
            (0x00b8_c6aa_u32, 187),
            (0x0084_9682, 145),
            (0x00d7_b87c, 186),
            (0x00ee_a0a0, 217),
            (0x0093_ba8b, 151),
            (0x0029_443b, 59),
            (0x0013_1614, 233),
            (0x00f6_f5ef, 231),
            (0x0000_0000, 16),
            (0x00ff_ffff, 231),
            (0x007f_7f7f, 244),
        ] {
            let [_, r, g, b] = hex.to_be_bytes();
            assert_eq!(super::ansi256(r, g, b), index, "{hex:06x}");
        }
    }

    use super::*;

    const TRUECOLOR: Option<&str> = Some("truecolor");

    #[test]
    fn no_color_beats_everything_and_keeps_only_bold() {
        for t in [
            Theme::detect(
                true,
                Appearance::Light,
                Some("0;15"),
                TRUECOLOR,
                Some("xterm-256color"),
            ),
            Theme::detect(false, Appearance::Auto, None, TRUECOLOR, Some("dumb")),
        ] {
            for style in [
                t.text, t.muted, t.code, t.ok, t.info, t.pending, t.rule, t.accent, t.warn,
                t.error, t.strong,
            ] {
                assert_eq!((style.fg, style.bg), (None, None));
            }
            assert!(t.strong.add_modifier.contains(Modifier::BOLD));
            assert!(t.error.add_modifier.contains(Modifier::BOLD));
            assert!(!t.ok.add_modifier.contains(Modifier::BOLD));
        }
    }

    #[test]
    fn syntax_roles_resolve_per_depth_and_collapse_to_bold_and_plain() {
        let count = |styles: &[Style]| styles.iter().filter(|s| s.fg.is_some()).count();
        // Truecolor: every one of the 14 roles carries its generated palette color.
        let truecolor = Theme::new(ColorDepth::TrueColor, false);
        assert_eq!(count(&syntax_styles(&truecolor.syntax)), 14);
        assert_eq!(truecolor.syntax.comment.fg, Some(DARK.syntax.comment));
        assert_eq!(
            Theme::new(ColorDepth::TrueColor, true).syntax.string.fg,
            Some(LIGHT.syntax.string)
        );
        // 256 colors: the same palette mapped to indexes.
        let ansi = Theme::new(ColorDepth::Ansi256, false);
        assert!(matches!(ansi.syntax.keyword.fg, Some(Color::Indexed(_))));
        // 16 colors and no color: no foregrounds, keywords and types bold, comments muted by role.
        for depth in [ColorDepth::Basic, ColorDepth::None] {
            let t = Theme::new(depth, false);
            assert_eq!(count(&syntax_styles(&t.syntax)), 0, "depth {depth:?}");
            assert!(t.syntax.keyword.add_modifier.contains(Modifier::BOLD));
            assert!(t.syntax.ty.add_modifier.contains(Modifier::BOLD));
            assert!(t.syntax.mac.add_modifier.contains(Modifier::BOLD));
            assert!(!t.syntax.string.add_modifier.contains(Modifier::BOLD));
        }
        assert!(Theme::no_color().syntax.comment.fg.is_none());
    }

    fn syntax_styles(s: &SyntaxStyles) -> [Style; 14] {
        [
            s.comment,
            s.keyword,
            s.string,
            s.number,
            s.ty,
            s.type_parameter,
            s.function,
            s.mac,
            s.parameter,
            s.property,
            s.constant,
            s.namespace,
            s.identifier,
            s.delimiter,
        ]
    }

    #[test]
    fn color_depth_falls_back_from_truecolor_to_256_to_16() {
        let accent = |colorterm, term, light| {
            Theme::detect(
                false,
                if light {
                    Appearance::Light
                } else {
                    Appearance::Dark
                },
                None,
                colorterm,
                term,
            )
            .accent
            .fg
        };
        assert_eq!(
            accent(TRUECOLOR, Some("xterm-256color"), false),
            Some(DARK.accent)
        );
        assert_eq!(accent(Some("24bit"), None, true), Some(LIGHT.accent));
        // 256 colors: the same palette mapped to an index, never a raw RGB the terminal cannot show.
        assert!(matches!(
            accent(None, Some("xterm-256color"), false),
            Some(Color::Indexed(_))
        ));
        assert_eq!(accent(None, Some("xterm"), false), Some(Color::Cyan));
        assert_eq!(accent(Some(""), None, true), Some(Color::Blue));
    }

    #[test]
    fn appearance_follows_the_flag_then_colorfgbg() {
        assert!(is_light(Appearance::Light, None));
        assert!(!is_light(Appearance::Dark, Some("0;15")));
        assert!(is_light(Appearance::Auto, Some("0;15")));
        assert!(is_light(Appearance::Auto, Some("0;default;15")));
        assert!(is_light(Appearance::Auto, Some("0;7")));
        assert!(!is_light(Appearance::Auto, Some("15;0")));
        assert!(!is_light(Appearance::Auto, Some("15;default")));
        assert!(!is_light(Appearance::Auto, None));
    }

    #[test]
    fn glyphs_follow_the_locale_and_the_plain_flag() {
        assert!(!is_ascii(glyph_set(false, Some("en_US.UTF-8"))));
        assert!(!is_ascii(glyph_set(false, Some("C.utf8"))));
        assert!(is_ascii(glyph_set(false, Some("C"))));
        assert!(is_ascii(glyph_set(false, Some("en_US.ISO-8859-1"))));
        assert!(is_ascii(glyph_set(false, None)));
        assert!(is_ascii(glyph_set(true, Some("en_US.UTF-8"))));
        assert_eq!(
            pick_locale(Some(""), Some("C"), Some("en_US.UTF-8")),
            Some("C")
        );
        assert_eq!(pick_locale(Some(""), None, Some("")), None);
        // The marks follow the glyph set.
        assert_eq!(Theme::no_color().with_glyphs(&ASCII).marks, &ASCII_MARKS);
    }

    #[test]
    fn spinner_is_deterministic_and_still_under_reduced_motion() {
        assert_eq!(spinner_frame(&UNICODE, 79, false), UNICODE.spinner[0]);
        assert_eq!(spinner_frame(&UNICODE, 80, false), UNICODE.spinner[1]);
        assert_eq!(spinner_frame(&UNICODE, 800, false), UNICODE.spinner[0]);
        assert_eq!(spinner_frame(&ASCII, 240, false), "\\");
        assert_eq!(spinner_frame(&UNICODE, 12345, true), "\u{25cf}");
        assert_eq!(spinner_frame(&ASCII, u64::MAX, true), "*");
    }
}
