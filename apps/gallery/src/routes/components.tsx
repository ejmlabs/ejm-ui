import {
  Actions, AppField, AppForm, Badge, Button, Checkbox, Columns, ContentFlow, DensityPair, Dialog, Disclosure, Fact, Facts, GameClock, Hero, Input,
  KeyHints, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Prompt, RadioGroup, Section, Select, StateBlock, Status, Switch,
  Table, Tabs, Text, Textarea, ThemePair, ToastProvider, Tooltip, useDensity, useToast,
} from '@ejm/ui';
import { Plus } from 'lucide-react';
import { lazy, Suspense, useId, useState } from 'react';

// The barrel does not export Chessboard, so cm-chessboard loads only on this route, after mount. The server renders the leaf directly, which
// draws its loading square, so hydration finds the same HTML.
const Chessboard = import.meta.env.SSR
  ? (await import('@ejm/ui/components/Chessboard')).Chessboard
  : lazy(() => import('@ejm/ui/components/Chessboard').then(module => ({ default: module.Chessboard })));
const italianGame = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Every control, drawn from the one control recipe. Each part is a block of the kit, so nothing here chooses a size, radius, color or spacing.
// Sections alternate Mist and Paper on their own and nested sections take the next heading level. Overlays open on the page theme.

const statuses = ['ok', 'warn', 'error', 'info', 'pending'] as const;

const packages = [
  { name: '@ejm/core', size: 12, note: 'Headless logic for every target, with no framework' },
  { name: '@ejm/ui', size: 48, note: 'Components, hooks and layouts' },
  { name: '@ejm/tokens', size: 6, note: 'Brand colors and the generated theme' },
];
const columns = [
  { key: 'name', label: 'Package' },
  { key: 'size', label: 'Size (KB)' },
  { key: 'note', label: 'What it is', width: 28 },
];

/** One of each control. Rendered under both densities and both themes, so each shows what the surface decides. */
function ControlSet() {
  const id = useId();
  const density = useDensity();
  const [plan, setPlan] = useState('pro');
  return (
    <>
      <Actions>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </Actions>
      <AppField>
        <label htmlFor={`${id}-name`}>Name</label>
        <Input id={`${id}-name`} placeholder="Ada Lovelace" />
      </AppField>
      <AppField>
        <label htmlFor={`${id}-plan`}>Plan</label>
        <Select id={`${id}-plan`} defaultValue="pro"><option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option></Select>
      </AppField>
      <Actions>
        <Checkbox label="Checked" defaultChecked />
        <Switch label="On" defaultChecked />
      </Actions>
      <RadioGroup label="Plan" name={`${id}-radio`} value={plan} onValueChange={setPlan} options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]} />
      <Tabs label={`Products, ${density}`} tabs={[
        { id: 'cli', label: 'ejm-cli', panel: <Text as="p">A terminal agent that works in your repository.</Text> },
        { id: 'ide', label: 'ejm-ide', panel: <Text as="p">An editor and engine for the same work.</Text> },
      ]} />
      <Actions>
        <Badge>ejm-cli</Badge>
        <Badge tone="ok">ok</Badge>
        <Badge tone="warn">warn</Badge>
        <Badge tone="error">error</Badge>
      </Actions>
    </>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <Actions>
      <Button variant="secondary" onClick={() => toast({ title: 'Saved', description: 'Your changes are live.' })}>Show a toast</Button>
      <Button variant="ghost" onClick={() => toast({ title: 'Project deleted', action: { label: 'Undo', altText: 'Undo the delete', onClick: () => {} } })}>With an action</Button>
    </Actions>
  );
}

function Overlays() {
  const id = useId();
  const [dialog, setDialog] = useState(false);
  return (
    <>
      <Section title="Dialog">
        <Actions><Button variant="secondary" onClick={() => setDialog(true)}>Open a dialog</Button></Actions>
        <Dialog open={dialog} onOpenChange={setDialog} title="Rename the project" description="Pick a short name. You can change it later.">
          <AppField>
            <label htmlFor={`${id}-name`}>Name</label>
            <Input id={`${id}-name`} defaultValue="ejm-ui" />
          </AppField>
          <Actions>
            <Button onClick={() => setDialog(false)}>Save</Button>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
          </Actions>
        </Dialog>
      </Section>
      <Section title="Menu">
        <Actions>
          <Menu>
            <MenuTrigger asChild><Button variant="secondary">Open a menu</Button></MenuTrigger>
            <MenuContent>
              <MenuLabel>Project</MenuLabel>
              <MenuItem>Rename</MenuItem>
              <MenuItem>Copy link</MenuItem>
              <MenuSeparator />
              <MenuItem disabled>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </Actions>
      </Section>
      <Section title="Tooltip">
        <Actions>
          <Tooltip content="Copy the install command"><Button variant="secondary">Copy</Button></Tooltip>
          <Tooltip content="Add a project"><Button variant="secondary" size="icon" aria-label="Add a project"><Plus aria-hidden /></Button></Tooltip>
        </Actions>
      </Section>
      <Section title="Toast">
        <ToastDemo />
      </Section>
    </>
  );
}

export default function ComponentsPage() {
  const id = useId();
  const [prompt, setPrompt] = useState('ejm init');
  const [proposed, setProposed] = useState('');
  return (
    <ToastProvider>
      <Hero eyebrow="ejm-ui / components" title="One control recipe.">
        <p>Every control shares one height, one radius, one hover, one focus ring and one disabled state. A surface decides the density.</p>
      </Hero>

      <Section title="Buttons" intro={<p>Primary is the Sage fill. Secondary is a hairline outline. Sizes are md and icon.</p>}>
        <Section title="Variants">
          <Actions>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </Actions>
        </Section>
        <Section title="Arrow, icon and link">
          <Actions>
            <Button arrow>Get started</Button>
            <Button variant="link" arrow>Read the docs</Button>
            <Button size="icon" variant="secondary" aria-label="Add"><Plus aria-hidden /></Button>
            <Button asChild variant="secondary"><a href="/docs/components/">A link as a button</a></Button>
          </Actions>
        </Section>
      </Section>

      <Section title="Fields" intro={<p>Native input, select and textarea in the control radius. A message under a field carries a word as well as a color.</p>}>
        <AppForm onSubmit={event => event.preventDefault()}>
          <AppField>
            <label htmlFor={`${id}-name`}>Name</label>
            <Input id={`${id}-name`} placeholder="Ada Lovelace" />
          </AppField>
          <AppField>
            <label htmlFor={`${id}-email`}>Email, invalid</label>
            <Input id={`${id}-email`} type="email" defaultValue="ada@" aria-invalid="true" aria-describedby={`${id}-err`} />
            <Text as="p" id={`${id}-err`}><Status status="error" label="Enter a full email address." /></Text>
          </AppField>
          <AppField>
            <label htmlFor={`${id}-plan`}>Plan</label>
            <Select id={`${id}-plan`} defaultValue="pro"><option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option></Select>
          </AppField>
          <AppField>
            <label htmlFor={`${id}-off`}>Disabled</label>
            <Input id={`${id}-off`} disabled defaultValue="Read only" />
          </AppField>
          <AppField>
            <label htmlFor={`${id}-msg`}>Message</label>
            <Textarea id={`${id}-msg`} placeholder="Describe what you are building." />
          </AppField>
        </AppForm>
      </Section>

      <Section title="Choices" intro={<p>Checkbox, radio group and switch. The label is the whole target, 44 px tall.</p>}>
        <Section title="Checkbox">
          <Actions>
            <Checkbox label="Unchecked" />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="Mixed" checked="indeterminate" />
            <Checkbox label="Disabled" disabled />
          </Actions>
        </Section>
        <Section title="Radio group">
          <PlanRadio />
        </Section>
        <Section title="Switch">
          <Actions>
            <Switch label="Off" />
            <Switch label="On" defaultChecked />
            <Switch label="Disabled" disabled />
          </Actions>
        </Section>
      </Section>

      <Section title="Tabs and disclosure" intro={<p>Tabs move with arrows, Home and End. A disclosure is a native details element, so it works without a script.</p>}>
        <Tabs label="Products" tabs={[
          { id: 'cli', label: 'ejm-cli', panel: <Text as="p">A terminal agent that works in your repository.</Text> },
          { id: 'ide', label: 'ejm-ide', panel: <Text as="p">An editor and engine for the same work.</Text> },
          { id: 'harness', label: 'ejm-harness', panel: <Text as="p">A harness that checks the work.</Text> },
        ]} />
        <div>
          <Disclosure summary="What is a disclosure?">
            <Text as="p">A summary row that opens and closes its content. The row is a control, so it takes the control height and hover.</Text>
          </Disclosure>
          <Disclosure summary="Does it need a script?" open>
            <Text as="p">No. The browser opens and closes it.</Text>
          </Disclosure>
        </div>
      </Section>

      <Section title="Overlays" intro={<p>Dialog, menu, tooltip and toast are the only parts that float, so they are the only ones with a shadow. They share one chrome.</p>}>
        <Overlays />
      </Section>

      <Section title="Status vocabulary" intro={<p>Five status words, one glyph each. A badge takes the same names plus neutral. Color is never the only signal.</p>}>
        <Facts>
          {statuses.map(s => (
            <Fact key={s} label={s}>
              <Actions><Status status={s} /><Badge tone={s}>{s}</Badge></Actions>
            </Fact>
          ))}
          <Fact label="neutral">
            <Actions><Badge>ejm-cli</Badge><Badge separator="slash">Terminal agent</Badge><Badge separator="dot">v0.4</Badge></Actions>
          </Fact>
        </Facts>
        <Section title="Empty, loading and error">
          <StateBlock kind="empty" message="No projects yet. Create one to see it here." action={{ label: 'Create a project' }} />
          <StateBlock kind="loading" message="Loading your projects." />
          <StateBlock kind="error" message="Your projects could not be loaded. Check your connection and try again." action={{ label: 'Try again' }} />
        </Section>
      </Section>

      <Section title="Data" intro={<p>Tables keep the header in every state and scroll inside their own region on a narrow screen.</p>}>
        {/* A wide child (a table or a prompt line) goes directly in a top-level body, or in a min-w-0 flow: a nested Section would widen a 320px page. */}
        <Table label="Packages" caption="Populated" columns={columns} rows={packages} />
        <Table label="Empty" caption="Empty" columns={columns} rows={[]} state="empty" action={{ label: 'Add a package' }} />
        <Table label="Loading" caption="Loading" columns={columns} rows={[]} state="loading" />
        <Table label="Error" caption="Error" columns={columns} rows={[]} state="error" action={{ label: 'Try again' }} />
      </Section>

      <Section title="Prompt and key hints" intro={<p>The terminal contract on the web: an input line in idle, busy and error, and the keys that work here.</p>}>
        <ContentFlow>
          <Prompt value={prompt} onValueChange={setPrompt} placeholder="Type a command" label="Command" />
          <Prompt value="ejm build" state="busy" label="Busy command" />
          <Prompt value="ejm nope" state="error" message="Unknown command: nope. Try ejm help." label="Failed command" />
          <KeyHints hints={[{ key: 'Enter', label: 'run' }, { key: 'Tab', label: 'complete' }, { key: 'Esc', label: 'cancel' }, { key: '?', label: 'help' }, { key: 'Ctrl+C', label: 'quit' }, { key: 'Ctrl+L', label: 'clear' }]} label="Shortcuts" />
        </ContentFlow>
      </Section>

      <Section title="Game parts" intro={<p>A clock and a lazy chessboard with no chess rules. The host owns time, legality and the accepted position; a move is only a proposal.</p>}>
        <Section title="Game clock">
          <Actions>
            <GameClock value="5:03" label="White has 5 minutes and 3 seconds" running />
            <GameClock value="4:41" label="Black has 4 minutes and 41 seconds" />
            <GameClock value="0:09" label="White has 9 seconds, low on time" low running />
          </Actions>
        </Section>
        <Section title="Chessboard">
          <Columns
            primary={<Suspense fallback={null}>
              <Chessboard fen={startPosition} color="w" enabled onMove={({ from, to }) => setProposed(`${from} to ${to}`)} />
            </Suspense>}
            secondary={<ContentFlow>
              <p>Tab to the board, then use the arrow keys and Enter to move.</p>
              <Text as="p" variant="muted" role="status">{proposed ? `Proposed: ${proposed}` : 'No move proposed. The position stays the same.'}</Text>
              <Suspense fallback={null}>
                <Chessboard fen={italianGame} color="w" enabled={false} readOnly lastMove={{ from: 'f1', to: 'c4' }} onMove={() => {}}
                  aria-label="Read-only chessboard. The Italian Game after White's bishop moves to c4. White is at the bottom." />
              </Suspense>
            </ContentFlow>}
          />
        </Section>
      </Section>

      <Section
        title="Density"
        emphasis
        intro={<p>Density comes from the surface. AppShell and an application Page make controls compact. DensityProvider sets it for any region. Touch keeps 44 px in both.</p>}
      >
        <DensityPair><ControlSet /></DensityPair>
      </Section>

      <Section title="Light and dark" intro={<p>The same controls under both themes. A data-theme attribute starts a theme for its subtree.</p>}>
        <ThemePair><ControlSet /></ThemePair>
      </Section>
    </ToastProvider>
  );
}

function PlanRadio() {
  const id = useId();
  const [plan, setPlan] = useState('pro');
  return (
    <RadioGroup
      label="Plan"
      name={`${id}-plan`}
      value={plan}
      onValueChange={setPlan}
      options={[
        { value: 'free', label: 'Free', description: 'For a single project.' },
        { value: 'pro', label: 'Pro', description: 'For a small team.' },
        { value: 'team', label: 'Team', description: 'Unavailable in this example.', disabled: true },
      ]}
    />
  );
}
