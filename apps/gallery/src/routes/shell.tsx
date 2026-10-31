import markInk from '@ejm/tokens/assets/projects/ui/mark-ink.svg?url';
import markPaper from '@ejm/tokens/assets/projects/ui/mark-paper.svg?url';
import { ExternalLink, Header, Hero, InlineCode, InlineLink, Row, Rows, Section, Specimen, ThemePair, type HeaderProps, type SpecimenTheme } from '@ejm/ui';

// Header, footer and layouts, shown the way a site uses them. The gallery's SiteLayout (src/frame.tsx) wraps this whole page, so the
// header and footer you see are the real ones. The previews use a data-theme on a pane to show both themes side by side.

const nav: HeaderProps['nav'] = [
  { label: 'Docs', href: '/docs/' },
  { label: 'Components', href: '/components/' },
  { label: 'Layout', href: '/layout/' },
  { label: 'App', href: '/app/' },
  { label: 'Product', href: '/product/' },
];
const identity = { name: 'ejm-ui', artwork: { src: markInk, darkSrc: markPaper, width: 256, height: 256 } };

const header = <Header identity={identity} homeLabel="ejm-ui home" nav={nav} />;

/** A Header in a themed specimen, full width, so it shows its inline nav on a wide screen. */
function HeaderPreview({ theme, label }: { theme: SpecimenTheme; label: string }) {
  return <Specimen label={label} theme={theme}>{header}</Specimen>;
}

export default function ShellPage() {
  return (
    <>
      <Hero eyebrow="ejm-ui / shell" title="Header, footer and layouts.">
        <p>
          Every page of this gallery sits in a SiteLayout: skip link, sticky header with the theme toggle last, <InlineCode>main#main</InlineCode> and the footer below.
          The header folds its nav into the menu by its own width, so it works in a narrow column as well as on a phone.
        </p>
      </Hero>

      <Section
        title="Header in both themes."
        kicker="01 / Header"
        intro={<p>The toggle is always the last item. Below 48rem of header width the nav is one Menu button that opens an overlay, with no layout shift.</p>}
      >
        <HeaderPreview theme="light" label="Light theme" />
        <HeaderPreview theme="dark" label="Dark theme" />
        <Section title="In a narrow column">
          <p>Half a column is narrower than 48rem, so each header shows the Menu button here even on a wide screen.</p>
          <ThemePair>{header}</ThemePair>
        </Section>
      </Section>

      <Section
        title="Frames in use."
        kicker="02 / Layouts"
        intro={<p>A frame owns the skip link, the landmarks and the reading width. A page supplies words.</p>}
      >
        <Rows aria-label="Layouts">
          <Row title="SiteLayout" href="/" description="Skip link, sticky header, main and footer. Every page of this gallery." meta="Sites" />
          <Row title="DocsLayout" href="/docs/" description="A sidebar, a 68ch reading column and a contents list. Both fold into labelled disclosures below 1024px and 1280px." meta="Documentation" />
          <Row title="AppShell" href="/app-shell/" description="A top bar and a side nav around the content, with compact controls." meta="Applications" />
        </Rows>
        <p>
          The frame for applications is on its own page, <InlineLink href="/app-shell/">App shell</InlineLink>. Read more about ejmlabs on <ExternalLink href="https://ejmlabs.com">ejmlabs.com</ExternalLink>.
        </p>
      </Section>
    </>
  );
}
