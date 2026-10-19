import { Link } from '@ejm/ssg';
import ripple from '@ejm/ui/art/inline/divider-ripple.svg?raw';
import { PROJECT_LIST } from '@ejm/site/projects';
import { Band, Button, Fact, Facts, Hero, Row, Rows, SectionHead, Stat } from '@ejm/ui';
import { pages } from '../pages';

// The gallery home: ejm-ui's own landing page, in the language it documents. A type-led hero (real product shots go in the hero's `aside`
// slot and in the surfaces rows once @ejm/shots has them; simulated windows are not product imagery), a Sage
// band that lists every page, a Mist band of facts, and an Ink band. The rows come from src/pages.ts, so a new page appears here by itself.

export default function Home() {
  return (
    <>
      <Hero
        art={ripple}
        drawOn
        eyebrow="ejmlabs / ejm-ui"
        title="One system for every ejmlabs surface."
        actions={
          <>
            <Button asChild arrow><Link href="/docs/">Read the docs</Link></Button>
            <Button asChild variant="link"><Link href="/components/">See the components</Link></Button>
          </>
        }
      >
        <p className="m-0">ejm-ui is the design system behind ejmlabs.com, ejm-cli, ejm-ide and ejm-harness. ejmlabs is a one-person lab for small experiments, useful software and open source tools.</p>
      </Hero>

      <Band id="pages" tone="sage" aria-labelledby="pages-title">
        <SectionHead kicker="01 / Pages" title="Everything is on a page." id="pages-title">
          <p className="m-0">Each page is prerendered to plain HTML, so it reads with scripts off. Start with the docs, or go straight to what you need.</p>
        </SectionHead>
        <Rows className="mt-16" aria-label="Gallery pages">
          {pages.map(p => (
            <Row key={p.path} title={p.label} description={p.description} meta={p.meta} href={p.path} />
          ))}
        </Rows>
      </Band>

      <Band tone="paper" aria-labelledby="surfaces-title">
        <SectionHead kicker="02 / Surfaces" title="Built once, used everywhere." id="surfaces-title">
          <p className="m-0">The same tokens and components run the ejmlabs sites, the terminal agent, the IDE and the engine.</p>
        </SectionHead>
        <Rows className="mt-16" aria-label="ejmlabs surfaces">
          {PROJECT_LIST.filter(p => p.id !== 'ejmlabs').map(p => (
            <Row key={p.id} title={p.name} description={p.tagline} meta={p.host} href={p.url} external />
          ))}
        </Rows>
      </Band>

      <Band tone="mist" aria-labelledby="system-title">
        <SectionHead kicker="03 / System" title="Small on purpose." id="system-title">
          <p className="m-0">A few firm choices keep every surface calm and recognizable, from a landing page to a terminal.</p>
        </SectionHead>
        <div className="mt-16 grid gap-x-12 gap-y-14 lg:grid-cols-12">
          <Facts className="lg:col-span-6 lg:self-start">
            <Fact label="fonts">Manrope and IBM Plex Mono</Fact>
            <Fact label="ground">Paper, Mist, Sage and Ink bands</Fact>
            <Fact label="groups">Type, space, hairlines and bands, never cards</Fact>
            <Fact label="runtime">React 19, strict TypeScript, Tailwind CSS 4</Fact>
          </Facts>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-6">
            <Stat figure="4" label="bands" />
            <Stat figure="2" label="themes" />
            <Stat figure="0" label="cards" />
            <Stat figure="95" label="KB script budget per page" />
          </div>
        </div>
      </Band>

      <Band tone="ink" aria-labelledby="checks-title" className="py-rhythm-sm">
        <SectionHead kicker="04 / Checks" title="Every rule is a script." size="title" id="checks-title">
          <p className="m-0"><Button asChild arrow><Link href="/docs/checks/">Checks and budgets</Link></Button></p>
        </SectionHead>
      </Band>
    </>
  );
}
