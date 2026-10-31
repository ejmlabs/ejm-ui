import { Fact, Facts, Hero, Section } from '@ejm/ui';

export default function About() {
  return (
    <>
      <Hero eyebrow="About" title="What is in the starter">
        One small site that uses every shared part, so you can copy it.
      </Hero>
      <Section title="What it uses">
        <Facts>
          <Fact label="Runtime">Real React 19, prerendered to static HTML by @ejm/ssg and hydrated on load.</Fact>
          <Fact label="Look">@ejm/ui layouts on the @ejm/tokens palette and the two brand fonts.</Fact>
          <Fact label="Shared">Analytics, head, theme boot and security headers from @ejm/site.</Fact>
        </Facts>
      </Section>
    </>
  );
}
