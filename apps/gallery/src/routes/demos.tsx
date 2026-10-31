import { LazyCliPreview } from '@ejm/demos/islands/cli-preview';
import { LazyIdePreview } from '@ejm/demos/islands/ide-preview';
import { LazyHarnessPreview } from '@ejm/demos/islands/harness-preview';
import { Hero, Section } from '@ejm/ui';

// Local recorded workflows. Each section keeps a complete static outcome before its playback loads.

export default function Demos() {
  return (
    <>
      <Hero eyebrow="ejm-ui / demos" title="Watch the three products.">
        <p>Pause, resume or restart each recording.</p>
      </Hero>
      <Section id="cli" title="ejm-cli" intro={<p>A retry fix, its patch and three recorded passing tests. This local playback runs no commands or model calls.</p>}>
        <LazyCliPreview />
      </Section>
      <Section id="ide" title="ejm-ide" intro={<p>Two reviewed edits and five added boundary tests. The tests were not run; this local playback uses no model connection.</p>}>
        <LazyIdePreview />
      </Section>
      <Section id="harness" title="ejm-harness" intro={<p>Formatted local recording. No worker or model runs here. Resource figures are admission reservations.</p>}>
        <LazyHarnessPreview />
      </Section>
    </>
  );
}
