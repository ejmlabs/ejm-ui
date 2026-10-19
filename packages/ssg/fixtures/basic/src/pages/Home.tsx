import { Static } from '@ejm/ssg';

const prose = import.meta.env.SSR || import.meta.env.DEV ? await import('./Prose') : undefined;

export default function Home() {
  return (
    <>
      <h1>Home heading</h1>
      <p>Static content that must exist before any script runs.</p>
      <Static render={prose ? () => <prose.Prose /> : undefined} />
    </>
  );
}
