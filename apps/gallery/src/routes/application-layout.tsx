import {
  AppActions, AppField, AppFlow, AppForm, AppGroup, AppHeading, AppSection, Button, DensityProvider, InlineLink, Input, Page, Rule, SectionHead, Table, Text,
  type Density,
} from '@ejm/ui';
import { useState } from 'react';

// An application page is not a site page: it has no Hero and no bands. `Page variant="application"` is the surface. It sets the
// compact density and the content gaps, and the application recipes (AppSection, AppForm, AppField) carry the rest.

const columns = [{ key: 'player', label: 'Player' }, { key: 'games', label: 'Games' }, { key: 'points', label: 'Points' }];
const rows = [{ player: 'Alex', games: 12, points: 8 }, { player: 'Sam', games: 10, points: 6 }];
const states = ['default', 'loading', 'empty', 'error'] as const;
const densities: { density: Density; title: string }[] = [
  { density: 'compact', title: 'Compact tables' },
  { density: 'comfortable', title: 'Comfortable tables' },
];
const messages = { empty: 'No games have finished in this example.', error: 'The example results could not load.' } as const;

/** A complete application composition. The data and saved form values are local examples. */
export default function ApplicationLayoutPage() {
  const [saved, setSaved] = useState('The preview has no saved values.');
  return (
    <Page variant="application">
      <SectionHead purpose="application" as="h1" id="application-title" title="Application layout">
        <Text as="p">
          A compact page with related fields, readable links and clear table states. These are simulated examples, and the form saves only in this preview.
        </Text>
      </SectionHead>

      <AppSection aria-labelledby="application-form-title">
        <AppHeading id="application-form-title">Player preferences</AppHeading>
        <Text as="p">
          Read the <InlineLink href="/docs/components/">component guide</InlineLink> for field and action contracts. Links within a sentence keep the same text flow.
        </Text>
        <AppForm onSubmit={event => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setSaved(`Saved for this preview: ${String(values.get('name'))}.`);
        }}>
          <AppField>
            <label htmlFor="application-name">Display name</label>
            <Input id="application-name" name="name" defaultValue="Alex" required aria-describedby="application-name-help" />
            <Text as="p" variant="muted" id="application-name-help">Use a name other players can recognise.</Text>
          </AppField>
          <AppField>
            <label htmlFor="application-email">Recovery email, optional</label>
            <Input id="application-email" name="email" type="email" aria-describedby="application-email-help" />
            <Text as="p" variant="muted" id="application-email-help">This example sends no email and stores no account.</Text>
          </AppField>
          <AppActions>
            <Button type="submit">Save preview</Button>
            <Text as="p" variant="muted" role="status">{saved}</Text>
          </AppActions>
        </AppForm>
      </AppSection>

      {densities.map(({ density, title }) => (
        <AppFlow as="section" key={density} aria-labelledby={`application-${density}-title`}>
          <AppHeading id={`application-${density}-title`}>{title}</AppHeading>
          <DensityProvider density={density}>
            {states.map(state => (
              <AppGroup key={state}>
                <Rule label={state === 'default' ? 'Populated' : state[0]!.toUpperCase() + state.slice(1)} />
                <Table
                  columns={columns}
                  rows={state === 'default' ? rows : []}
                  state={state}
                  label={`${density} ${state} example`}
                  message={state === 'empty' || state === 'error' ? messages[state] : undefined}
                />
              </AppGroup>
            ))}
          </DensityProvider>
        </AppFlow>
      ))}
    </Page>
  );
}
