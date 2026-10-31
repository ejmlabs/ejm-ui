import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Shell } from './islands/parts';
import { ShowcaseFrame } from './ShowcaseFrame';

afterEach(cleanup);
it('gives each product its own note association and retains native playback controls', () => {
  render(<>
    <ShowcaseFrame label="CLI example"><button>Pause CLI</button></ShowcaseFrame>
    <ShowcaseFrame label="IDE example" note="Recorded local output."><button>Restart IDE</button></ShowcaseFrame>
  </>);
  const cli = screen.getByRole('group', { name: 'CLI example' });
  const ide = screen.getByRole('group', { name: 'IDE example' });
  expect(cli).toHaveAccessibleDescription('Example session. Runs in your browser without a model connection.');
  expect(ide).toHaveAccessibleDescription('Recorded local output.');
  expect(cli.getAttribute('aria-describedby')).not.toBe(ide.getAttribute('aria-describedby'));
  expect(screen.getByRole('button', { name: 'Pause CLI' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Restart IDE' })).toBeEnabled();
});

it('fills its column up to a maximum width instead of shrinking to its content, so a grid child needs no wrapper', () => {
  render(<ShowcaseFrame label="CLI example"><p>Short</p></ShowcaseFrame>);
  expect(screen.getByRole('group', { name: 'CLI example' })).toHaveClass('w-full', 'max-w-6xl', 'mx-auto', 'min-w-0');
});

it('shows one disclosure for an island: its own note alone, the frame note inside a ShowcaseFrame', () => {
  const island = (
    <Shell name="ejm-ide" meta="Edi" label="ejm-ide demo" caption="Pick a prompt." note="Simulated demo. Nothing is sent anywhere."
      paused={false} onPause={() => {}} onReset={() => {}} live={[]} host={{ current: null }}>
      <p>Editor</p>
    </Shell>
  );
  const { unmount } = render(island);
  expect(screen.getAllByText('Simulated demo. Nothing is sent anywhere.')).toHaveLength(1);
  unmount();
  render(<ShowcaseFrame label="ejm-ide example" note="Simulated demo. Nothing is sent anywhere.">{island}</ShowcaseFrame>);
  const note = screen.getByText('Simulated demo. Nothing is sent anywhere.');
  expect(screen.getByRole('group', { name: 'ejm-ide example' })).toHaveAttribute('aria-describedby', note.id);
  expect(screen.getByText('Pick a prompt.')).toBeInTheDocument();
  cleanup();
  // A frame that shows no note leaves the island's own.
  render(<ShowcaseFrame label="ejm-ide example" note={null}>{island}</ShowcaseFrame>);
  expect(screen.getAllByText('Simulated demo. Nothing is sent anywhere.')).toHaveLength(1);
});
