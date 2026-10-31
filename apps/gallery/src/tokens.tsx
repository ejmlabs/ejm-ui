import { BANDS, HUES, type Band as BandName } from '@ejm/tokens';
import { Actions, Band, Button, ContentFlow, Elevations, Hero, Legend, Row, Rows, Section, SectionBody, SectionHead, Status, TypeScale } from '@ejm/ui';

// The contract page: every band, the type scale and elevation, drawn only with kit parts. It is also the screenshot target for the
// band, theme and size checks. A Section picks its own ground (Mist, Paper or Sage), so the four named bands are set with Band here,
// to show each one. The hue roles are shown the way charts use them, in a Legend; they are not defined on Sage.

const names: Record<BandName, string> = { paper: 'Paper', mist: 'Mist', sage: 'Sage', ink: 'Ink' };
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
          {band !== 'sage' && <Legend kind="line" items={HUES.map(label => ({ label }))} />}
        </ContentFlow>
      </SectionBody>
    </Band>
  );
}

export function Tokens() {
  return (
    <>
      <Hero eyebrow="ejm-ui / tokens" title="Four bands, one type scale.">
        <p>The bands, type scale and elevation, drawn only with parts of the kit.</p>
      </Hero>

      {BANDS.map(b => <BandSample key={b} band={b} />)}

      <Section title="Type scale." kicker="Type" intro={<p>Six sizes, two families. Display and title scale with the screen.</p>}>
        <TypeScale />
      </Section>

      <Section title="Elevation." kicker="Depth" intro={<p>Only product windows, menus and overlays have a shadow. These are the three levels.</p>}>
        <Elevations />
      </Section>
    </>
  );
}
