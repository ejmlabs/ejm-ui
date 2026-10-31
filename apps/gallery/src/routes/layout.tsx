import ripple from '@ejm/ui/art/inline/divider-ripple.svg?raw';
import { Actions, Button, CodeBlock, Columns, ContentFlow, Fact, Facts, Hero, MetricGrid, ProductStage, Row, Rows, Rule, Section, Stat, Status, Text } from '@ejm/ui';
import type { RowState, StatState } from '@ejm/core';
import { Cli, Harness, Ide, StageCaptions } from '../windows';

// The layout showcase: one Hero and a stack of Sections, so the page is its own example. Level, ground, ids and spacing are derived.
// Words come from the ejmlabs project READMEs; the product images are real captures with provenance captions.

const GITHUB = 'https://github.com/ejmlabs';

const rowStates: { title: string; state: RowState; description: string }[] = [
  { title: 'default', state: 'default', description: 'A row with no marker.' },
  { title: 'selected', state: 'selected', description: 'Marked by a glyph and a held tone.' },
  { title: 'focused', state: 'focused', description: 'Keyboard focus, marked by a glyph and a ring.' },
  { title: 'disabled', state: 'disabled', description: 'No link, and the word says why.' },
];

const statStates: StatState[] = ['default', 'loading', 'error', 'empty'];

const sectionExample = `<Hero title="Small experiments" />

<Section title="Projects" kicker="01 / Projects">
  <Rows aria-label="Projects">...</Rows>

  <Section title="Terminal">
    <p>A subsection, one level down.</p>
  </Section>
</Section>

<Section title="Why" emphasis>...</Section>`;

export default function Layout() {
  return (
    <>
      <Hero
        art={ripple}
        drawOn
        eyebrow="ejm-ui / layout"
        title="One Hero, then Sections."
        aside={
          // ejm-shots-allow: layout demonstration of ProductStage with real ProductShot children.
          <>
            <ProductStage>
              <Cli />
              <Ide />
              <Harness />
            </ProductStage>
            <StageCaptions />
          </>
        }
        actions={
          <>
            <Button asChild arrow><a href="#grounds">See how a page is built</a></Button>
            <Button asChild variant="link"><a href={GITHUB} rel="external">Read the source</a></Button>
          </>
        }
      >
        <p>This page is its own example. It is one Hero and five Sections. The kit picks every heading level, ground, id and gap.</p>
      </Hero>

      <Section
        id="grounds"
        title="Grounds alternate."
        kicker="01 / Section"
        intro={<p>The first Section after the Hero is Mist, the next is Paper, and so on. No Section names its ground.</p>}
      >
        <Columns
          primary={
            <ContentFlow>
              <p>A top-level Section is a full-bleed band. Its title is an h2. A Section inside a Section is a subsection: no band, and its title is one level down.</p>
              <p>Heading levels, ids and spacing are never written by hand.</p>
            </ContentFlow>
          }
          secondary={<CodeBlock lang="tsx" code={sectionExample} />}
        />
        <Section title="Nested levels" kicker="Subsection">
          <p>This title is an h3 because it sits in a Section. The next one is an h4.</p>
          <Section title="One level deeper">
            <p>Levels stop at h6, and the Hero keeps the page's one h1.</p>
          </Section>
        </Section>
      </Section>

      <Section
        title="Three tools, one engine."
        kicker="02 / Rows"
        intro={<p>A hairline list replaces cards. The whole row is the link.</p>}
      >
        <Rows size="title" aria-label="Projects">
          <Row title="ejm-cli" href={`${GITHUB}/ejm-cli`} external description="A Rust terminal coding agent built on ejm-harness. Offline replay needs no account or server." meta="Rust / terminal" />
          <Row title="ejm-ide" href={`${GITHUB}/ejm-ide`} external description="A desktop IDE for writing and understanding code, with an agent beside the editor." meta="Tauri / macOS" />
          <Row title="ejm-harness" href={`${GITHUB}/ejm-harness`} external description="A reusable Rust engine for coding agents, with one resource governor and a durable event journal." meta="Rust / engine" />
        </Rows>
      </Section>

      <Section
        title="Every state has a word."
        kicker="03 / States"
        intro={<p>Status, rows and figures name their state in words and glyphs, never by color alone.</p>}
      >
        <Columns
          primary={
            <ContentFlow>
              <Rule label="Status" />
              {(['ok', 'warn', 'error', 'info', 'pending'] as const).map(s => <Status key={s} status={s} />)}
              <Rule label="Text" />
              <p>
                <Text>default</Text>, <Text variant="muted">muted</Text>, <Text variant="strong">strong</Text>, <Text variant="code">code</Text>
              </p>
            </ContentFlow>
          }
          secondary={
            <ContentFlow>
              <Rule label="Row" />
              <Rows aria-label="Row states">
                {rowStates.map(r => (
                  <Row key={r.state} title={r.title} state={r.state} description={r.description} href="#grounds" />
                ))}
              </Rows>
            </ContentFlow>
          }
        />
        <Rule label="Stat" />
        <MetricGrid>
          {statStates.map(s => (
            <Stat key={s} state={s} figure="42" label={`state: ${s}`} size="title" />
          ))}
        </MetricGrid>
      </Section>

      <Section
        title="Agents share one governor."
        kicker="04 / Engine"
        intro={<p>Agents share a resource governor instead of creating a shell each. These are the default limits.</p>}
      >
        <Columns
          primary={
            <Facts>
              <Fact label="license">MIT</Fact>
              <Fact label="written in">Rust, with TypeScript and Python SDKs</Fact>
              <Fact label="status">Source release, version 0.1.0</Fact>
              <Fact label="platform">macOS on Apple Silicon for ejm-ide</Fact>
            </Facts>
          }
          secondary={
            <MetricGrid>
              <Stat figure="100" label="managed sessions" />
              <Stat figure="8" label="model requests" />
              <Stat figure="4" label="local jobs" />
              <Stat figure="1" label="heavy job" />
            </MetricGrid>
          }
        />
      </Section>

      <Section title="Read it, build it, change it." kicker="05 / Open source" emphasis>
        <ContentFlow>
          <p>ejm-cli, ejm-ide and ejm-harness are open source under the MIT license.</p>
          <Actions>
            <Button asChild arrow><a href={GITHUB} rel="external">ejmlabs on GitHub</a></Button>
          </Actions>
        </ContentFlow>
      </Section>
    </>
  );
}
