import ripple from '@ejm/ui/art/inline/divider-ripple.svg?raw';
import { getShot } from '@ejm/shots';
import { Hero } from '@ejm/ui/layout/Hero';
import { ProductShot } from '@ejm/ui/layout/ProductShot';
import { Button, Section } from '@ejm/ui';

// Product imagery comes from captured binaries and the native desktop app. Interactive simulations live on /demos/.

const GITHUB = 'https://github.com/ejmlabs';

export default function Product() {
  return (
    <>
      <Hero
        art={ripple}
        drawOn
        title="Small experiments, useful things."
        aside={<ProductShot shot={getShot('cli', 'tui-read-refused')} alt="ejm-cli reads a file and refuses a write without a grant." priority frame />}
        actions={
          <>
            <Button asChild arrow><a href="#cli">See the product views</a></Button>
            <Button asChild variant="link"><a href={GITHUB} rel="external">Read the source</a></Button>
          </>
        }
      >
        <p>Real captures of the terminal tools and the desktop app. Each caption records its source and capture date.</p>
      </Hero>

      <Section id="cli" kicker="01 / ejm-cli" title="A terminal coding agent." intro={<p>File tools are read only until write access is granted at launch, so a proposed patch is shown and blocked.</p>}>
        <ProductShot shot={getShot('cli', 'tui-read-refused')} alt="ejm-cli reads package.json and refuses a file write because the session has read access only." frame />
      </Section>

      <Section id="ide" kicker="02 / ejm-ide" title="An agent beside the editor." intro={<p>The native desktop app opens a project tree, source editor and agent pane. This launch capture uses the dark theme in both page themes.</p>}>
        <ProductShot shot={getShot('ide', 'workspace-launch')} alt="The native ejm-ide project tree, source editor and assistant before a model is connected." />
      </Section>

      <Section id="harness" kicker="03 / ejm-harness" title="One governor, one journal." intro={<p>Sessions share resource limits. A journal records their events so interrupted work can be inspected and resumed.</p>}>
        <ProductShot shot={getShot('harness', 'journal')} alt="ejm-harness runs an offline replay session and prints the journal and resource limits." frame />
      </Section>
    </>
  );
}
