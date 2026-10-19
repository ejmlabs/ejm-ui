import { LazyDemo } from '@ejm/demos/islands';
import '../islands.css';
import { Band, SectionHead } from '@ejm/ui';

// The three interactive demo islands. Each page section serves the static product view (complete without scripts) and
// loads the live demo when it nears the viewport or when the visitor uses it. Nothing is sent anywhere.

export default function Demos() {
  return (
    <>
      <Band tone="paper" aria-labelledby="demos-title">
        <SectionHead kicker="Demos" title="Try the three products." id="demos-title" as="h1">
          <p className="m-0">Each demo is a simulation that runs in this page, follows a script and sends nothing anywhere. Replies are scripted and every number is a sample value.</p>
        </SectionHead>
      </Band>
      <Band id="cli" tone="mist" aria-labelledby="cli-title">
        <SectionHead kicker="01 / ejm-cli" title="A terminal coding agent." id="cli-title">
          <p className="m-0">Send a prompt, watch the patch get blocked, then grant write to apply it.</p>
        </SectionHead>
        <div className="mt-16"><LazyDemo product="cli" /></div>
      </Band>
      <Band id="ide" tone="sage" aria-labelledby="ide-title">
        <SectionHead kicker="02 / ejm-ide" title="An agent beside the editor." id="ide-title">
          <p className="m-0">Ask Edi for a change, review the diff, accept or reject it.</p>
        </SectionHead>
        <div className="mt-16"><LazyDemo product="ide" /></div>
      </Band>
      <Band id="harness" tone="paper" aria-labelledby="harness-title">
        <SectionHead kicker="03 / ejm-harness" title="One governor, one journal." id="harness-title">
          <p className="m-0">Add sessions, lower the limit, then crash the worker and watch the journal recover them.</p>
        </SectionHead>
        <div className="mt-16"><LazyDemo product="harness" /></div>
      </Band>
    </>
  );
}
