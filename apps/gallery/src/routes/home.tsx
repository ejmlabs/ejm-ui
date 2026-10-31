import { useState } from 'react';
import { Link } from '@ejm/ssg';
import { PROJECT_LIST } from '@ejm/site/projects';
import {
  Actions, AppActions, AppField, AppForm, AppSection, Button, Columns, ContentFlow, Fact, Facts, Hero, Input, MetricGrid,
  Row, Rows, Section, SectionHead, Stat, Text,
} from '@ejm/ui';
import { pages } from '../pages';

// The opening is a small component example (a form on the application recipes), so the first thing a visitor sees is the kit itself.
function ComponentExample() {
  const [saved, setSaved] = useState('Changes stay on this page.');
  return <AppSection aria-labelledby="example-title">
    <SectionHead purpose="application" kicker="Simulated component example" title="Project settings" id="example-title" />
    <AppForm onSubmit={event => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get('name'));
      setSaved(`Saved ${name} for this preview.`);
    }}>
      <AppField>
        <label htmlFor="example-name">Project name</label>
        <Input id="example-name" name="name" defaultValue="Harbor" required />
      </AppField>
      <AppActions><Button type="submit">Save preview</Button></AppActions>
      <Text as="p" variant="muted" role="status">{saved}</Text>
    </AppForm>
  </AppSection>;
}

export default function Home() {
  return (
    <>
      <Hero
        title="Build with ejm-ui."
        aside={<ComponentExample />}
        actions={
          <>
            <Button asChild arrow><Link href="/docs/">Read the docs</Link></Button>
            <Button asChild variant="link"><Link href="/components/">See the components</Link></Button>
          </>
        }
      >
        <p>Components, tokens and layouts for ejmlabs sites and apps. Each block fixes its own look, so any combination reads as one design.</p>
      </Hero>

      <Section title="Explore the system." kicker="01 / Pages">
        <Rows aria-label="Gallery pages">
          {pages.map(p => <Row key={p.path} title={p.label} description={p.description} meta={p.meta} href={p.path} />)}
        </Rows>
      </Section>

      <Section title="In use." kicker="02 / Surfaces">
        <Rows aria-label="ejmlabs surfaces">
          {PROJECT_LIST.filter(p => p.id !== 'ejmlabs' && p.id !== 'ui').map(p => (
            <Row key={p.id} title={p.name} description={p.tagline} meta={p.host} href={p.url} external />
          ))}
        </Rows>
      </Section>

      <Section title="Structure is derived." kicker="03 / System">
        <Columns
          primary={
            <ContentFlow>
              <p>
                You give a page its words. The kit picks the heading level, the ground, the ids, the spacing and the control size. Every
                page of this gallery is one Hero and a stack of Sections.
              </p>
              <Actions><Button asChild variant="link" arrow><Link href="/layout/">How a page is built</Link></Button></Actions>
            </ContentFlow>
          }
          secondary={
            <Facts>
              <Fact label="level">h2 at the top of a page, one deeper in each Section</Fact>
              <Fact label="ground">Mist and Paper alternate, Sage for emphasis</Fact>
              <Fact label="density">Comfortable on a site, compact in an application</Fact>
              <Fact label="classes">None accepted: components are closed</Fact>
            </Facts>
          }
        />
        <MetricGrid>
          <Stat figure="4" label="bands" />
          <Stat figure="2" label="themes" />
          <Stat figure="2" label="fonts" />
          <Stat figure="1" label="runtime" />
        </MetricGrid>
      </Section>

      <Section title="Check your build." kicker="04 / Checks" emphasis actions={<Button asChild arrow><Link href="/docs/checks/">Checks</Link></Button>}>
        <p>A build fails on a skipped heading, a missing skip link or an unmarked link to another site.</p>
      </Section>
    </>
  );
}
