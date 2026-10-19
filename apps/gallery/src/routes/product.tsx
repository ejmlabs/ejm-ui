import ripple from '@ejm/ui/art/inline/divider-ripple.svg?raw';
import { CliView, HarnessView, IdeView } from '@ejm/demos/views';
import { ProductHero } from '@ejm/demos/hero';
import { Band, Button, SectionHead } from '@ejm/ui';

// The product views end to end: the hero with its three floating windows, then each window large and still. All of it is drawn
// from the demo scenarios (packages/demos), so every command, flag, key and tool name is one the product documents.

const GITHUB = 'https://github.com/ejmlabs';

export default function Product() {
  return (
    <>
      <ProductHero
        art={ripple}
        drawOn
        eyebrow="ejmlabs / one-person lab"
        title="Small experiments, useful things."
        actions={
          <>
            <Button asChild arrow><a href="#cli">See the product views</a></Button>
            <Button asChild variant="link"><a href={GITHUB} rel="external">Read the source</a></Button>
          </>
        }
      >
        <p className="m-0">ejm-cli, ejm-ide and ejm-harness are open source. These windows are simulated screens made from the same scenarios as the live demos.</p>
      </ProductHero>

      <Band id="cli" tone="sage" aria-labelledby="cli-title">
        <SectionHead kicker="01 / ejm-cli" title="A terminal coding agent." id="cli-title">
          <p className="m-0">File tools are read only until write access is granted at launch, so a proposed patch is shown and blocked.</p>
        </SectionHead>
        <div className="mt-16"><CliView elevation="raised" label="ejm-cli, a simulated terminal screen" /></div>
      </Band>

      <Band id="ide" tone="mist" aria-labelledby="ide-title">
        <SectionHead kicker="02 / ejm-ide" title="An agent beside the editor." id="ide-title">
          <p className="m-0">Edi proposes an exact change, the diff shows in the chat, and the editor marks the lines that changed.</p>
        </SectionHead>
        <div className="mt-16"><IdeView elevation="raised" layout="auto" label="ejm-ide, a simulated screen" /></div>
      </Band>

      <Band id="harness" tone="paper" aria-labelledby="harness-title">
        <SectionHead kicker="03 / ejm-harness" title="One governor, one journal." id="harness-title">
          <p className="m-0">Sessions share a resource governor. After a crash the journal is replayed and nothing is run twice.</p>
        </SectionHead>
        <div className="mt-16"><HarnessView elevation="raised" layout="auto" label="ejm-harness, a simulated screen" /></div>
      </Band>
    </>
  );
}
