import {
  Actions, Button, Fact, Facts, Hero, Input, Reveal, Section, Stagger, Text, useClipboard, useContainerQuery, useDrawOn, useHotkeys, useInView,
  useMediaQuery, useReducedMotion, useTheme,
} from '@ejm/ui';
import { useState } from 'react';

// Live demos of the hooks and motion primitives. Each demo is a subsection: the hook's name, what it does, its value and the control that changes it.

function ThemeDemo() {
  const { choice, resolved, setChoice, toggle } = useTheme();
  return (
    <>
      <Facts>
        <Fact label="choice">{choice}</Fact>
        <Fact label="on screen">{resolved}</Fact>
      </Facts>
      <Actions>
        {(['light', 'dark', 'system'] as const).map(c => (
          <Button key={c} variant={choice === c ? 'secondary' : 'ghost'} aria-pressed={choice === c} onClick={() => setChoice(c)}>{c}</Button>
        ))}
        <Button variant="secondary" onClick={toggle}>toggle</Button>
      </Actions>
    </>
  );
}

function MediaDemo() {
  const wide = useMediaQuery('(min-width: 768px)');
  const reduced = useReducedMotion();
  return (
    <Facts>
      <Fact label="min-width 768px">{String(wide)}</Fact>
      <Fact label="reduced motion">{String(reduced)}</Fact>
    </Facts>
  );
}

function ContainerDemo() {
  const { ref, width, matches } = useContainerQuery<HTMLDivElement>({ minWidth: 420 });
  return (
    <>
      <Facts>
        <Fact label="width">{width ?? 'unmeasured'}px</Fact>
        <Fact label="at least 420px">{String(matches)}</Fact>
      </Facts>
      <Text as="p" variant="muted">Drag the corner of the line below.</Text>
      {/* The one raw element here: a resizable box the hook measures. */}
      <div ref={ref} className="hairline min-w-48 w-full" style={{ resize: 'horizontal', overflow: 'auto' }}>
        <Text as="p" variant="muted">{matches ? 'wide layout' : 'narrow layout'}</Text>
      </div>
    </>
  );
}

function InViewDemo() {
  const { ref, inView } = useInView<HTMLParagraphElement>();
  return <p ref={ref}>This line is {inView ? 'in view' : 'out of view'}.</p>;
}

function ClipboardDemo() {
  const { label, announcement, copy } = useClipboard();
  return (
    <>
      <Actions>
        <Text variant="code">npm i @ejm/ui</Text>
        <Button variant="secondary" onClick={() => void copy('npm i @ejm/ui')}>{label}</Button>
      </Actions>
      <Text as="p" variant="muted" role="status">{announcement}</Text>
    </>
  );
}

function HotkeysDemo() {
  const [log, setLog] = useState<string[]>([]);
  const push = (k: string) => setLog(l => [k, ...l].slice(0, 4));
  useHotkeys({ '?': () => push('?'), '/': () => push('/'), 'mod+k': () => push('mod+k'), g: () => push('g') });
  return (
    <>
      <Text as="p">Press ?, /, g or mod+k. Keys typed in the field do not count.</Text>
      <Input aria-label="Typing here does not fire plain keys" placeholder="Type here" />
      <Text as="p" variant="muted">{log.length ? `last: ${log.join(', ')}` : 'no keys yet'}</Text>
    </>
  );
}

function DrawDemo() {
  const ref = useDrawOn<SVGSVGElement>();
  return (
    <svg ref={ref} viewBox="0 0 120 60" className="art max-w-64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path pathLength="1" d="M4 50 C 30 4, 60 4, 116 50" />
      <path pathLength="1" d="M4 30 H 116" />
      <path pathLength="1" d="M60 4 V 56" />
    </svg>
  );
}

export default function HooksPage() {
  return (
    <>
      <Hero eyebrow="ejm-ui / hooks" title="Behavior, not boxes.">
        <p>Every hook is safe to render on the server. Scroll down and each section reveals once as it arrives. With reduced motion on, everything is simply there.</p>
      </Hero>

      <Section title="Theme and media" intro={<p>State the page reads from the visitor and the screen. The server and the first client render agree, then the real value arrives.</p>}>
        <Section title={<code>useTheme</code>}>
          <p>Light, dark or system. Saved to the ejm-theme cookie on ejmlabs.com, localStorage on other hosts.</p>
          <ThemeDemo />
        </Section>
        <Section title={<><code>useMediaQuery</code> and <code>useReducedMotion</code></>}>
          <p>A media query as state. Server and hydration render false, then the real value arrives.</p>
          <MediaDemo />
        </Section>
        <Section title={<code>useContainerQuery</code>}>
          <p>Adapt to the space a component has, measured with ResizeObserver.</p>
          <ContainerDemo />
        </Section>
        <Section title={<code>useInView</code>}>
          <p>True while the element is on screen.</p>
          <InViewDemo />
        </Section>
      </Section>

      <Section title="Clipboard and keys" intro={<p>Small behaviors that announce their result and clean up after themselves.</p>}>
        <Section title={<code>useClipboard</code>}>
          <p>Copy with a confirmation in words that returns to idle.</p>
          <ClipboardDemo />
        </Section>
        <Section title={<code>useHotkeys</code>}>
          <p>Scoped shortcuts that ignore typing and clean up after themselves.</p>
          <HotkeysDemo />
        </Section>
      </Section>

      <Section title="Motion" intro={<p>Transform and opacity only, in under 1.2 seconds, and nothing at all under reduced motion.</p>}>
        <Section title={<code>Reveal</code>}>
          <p>Plays once when it scrolls into view. The four lines below arrive with index 0 to 3 and four directions.</p>
          {(['up', 'fade', 'scale', 'left'] as const).map((from, i) => (
            <Reveal key={from} from={from} index={i}><Text as="p">from {from}, index {i}</Text></Reveal>
          ))}
        </Section>
        <Section title={<code>Stagger</code>}>
          <p>A staged entrance for what is on screen at load. The index stops at 8, so it ends in under 1.2 seconds.</p>
          <Stagger as="ul">
            {Array.from({ length: 5 }, (_, i) => <li key={i}>step {i}</li>)}
          </Stagger>
        </Section>
        <Section title={<code>useDrawOn</code>}>
          <p>Draws the art on once when it is seen. Without scripts or under reduced motion it is fully drawn.</p>
          <DrawDemo />
        </Section>
      </Section>
    </>
  );
}
