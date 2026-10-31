import { BANDS, HUES, type Band as BandName } from '@ejm/tokens';
import { Actions, Band, Button, ContentFlow, Hero, Row, Rows, Section, SectionBody, SectionHead, Status } from '@ejm/ui';

// The contract page: every band, the type scale and elevation, drawn only with the utilities @ejm/ui/styles.css defines.
// It is also the screenshot target for the band, theme and size checks. A Section picks its own ground (Mist, Paper or Sage), so the
// four named bands are set with Band here, to show each one. The type and shadow samples are the page's only raw elements.

const names: Record<BandName, string> = { paper: 'Paper', mist: 'Mist', sage: 'Sage', ink: 'Ink' };
const shadowClass = { rest: 'shadow-rest', raised: 'shadow-raised', float: 'shadow-float' } as const;
const rows = [
  ['ejm-cli', 'Terminal agent', 'v0.4'],
  ['ejm-ide', 'Editor and engine', 'v0.2'],
  ['ejm-harness', 'Test harness', 'v0.1'],
] as const;

function BandSample({ band }: { band: BandName }) {
  return (
    <Band tone={band}>
      <SectionHead kicker={`${band} band`} title={`${names[band]} sets the ground.`}>
        <p>Structure comes from display type, space and hairline rows. Muted text, links and rules all keep their contrast on this band.</p>
      </SectionHead>
      <SectionBody>
        <ContentFlow>
          <Rows aria-label={`${names[band]} sample rows`}>
            {rows.map(([name, what, version]) => <Row key={name} title={name} description={what} meta={version} />)}
          </Rows>
          <Actions>
            <Button asChild><a href="#main">Primary action</a></Button>
            <Button asChild variant="secondary"><a href="#main">Secondary</a></Button>
            <Button asChild variant="link"><a href="#main">A plain link</a></Button>
          </Actions>
          <Actions>
            {(['ok', 'warn', 'error', 'info'] as const).map(s => <Status key={s} status={s} />)}
          </Actions>
          {band !== 'sage' && (
            <p className="flex items-center gap-3" role="img" aria-label="Six hue roles">
              {HUES.map(h => (
                <span key={h} className="size-6 rounded-pill" style={{ backgroundColor: `var(--ejm-${h})` }} />
              ))}
            </p>
          )}
        </ContentFlow>
      </SectionBody>
    </Band>
  );
}

export function Tokens() {
  return (
    <>
      <Hero eyebrow="ejm-ui / tokens" title="Four bands, one type scale.">
        <p>The bands, type scale and elevation, drawn with only the utilities the theme defines.</p>
      </Hero>

      {BANDS.map(b => <BandSample key={b} band={b} />)}

      <Section title="Type scale." kicker="Type" intro={<p>Six sizes, two families. Display and title scale with the screen.</p>}>
        <div>
          <p className="hairline-t py-4 text-display">Display</p>
          <p className="hairline-t py-4 text-title">Title</p>
          <p className="hairline-t py-4 text-heading">Heading</p>
          <p className="hairline-t py-4 text-lead">Lead paragraph text</p>
          <p className="hairline-t py-4 text-body">Body text at 16 to 20 pixels.</p>
          <p className="hairline-t py-4 text-meta">META 0123456789 mono</p>
          <p className="hairline-t py-4 text-title tabular-nums">1,284</p>
        </div>
      </Section>

      <Section title="Elevation." kicker="Depth" intro={<p>Only product windows, menus and overlays have a shadow. These are the three levels.</p>}>
        <div className="flex flex-wrap gap-10">
          {(['rest', 'raised', 'float'] as const).map(level => (
            <div key={level} className={`scheme-page w-full max-w-64 rounded-window bg-ground p-6 text-ui-text ${shadowClass[level]}`}>
              <p className="text-meta">shadow-{level}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
