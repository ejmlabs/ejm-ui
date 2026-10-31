import { Link } from '@ejm/ssg';
import logoInk from '@ejm/tokens/assets/projects/ide/logo-ink.svg?url';
import logoPaper from '@ejm/tokens/assets/projects/ide/logo-paper.svg?url';
import { AppActions, AppFlow, AppHeading, AppShell, Brand, Button, SectionHead, Table, Text } from '@ejm/ui';

// AppShell is a whole page frame (top bar, side nav, content), so it has its own route. It makes every control inside compact.

const items = [
  ['Files', '#files'],
  ['Search', '#search'],
  ['Agent', '#agent'],
  ['Settings', '#settings'],
] as const;

const columns = [{ key: 'file', label: 'File' }, { key: 'size', label: 'Size (KB)' }];
const rows = Array.from({ length: 12 }, (_, i) => ({ file: `src/module-${i + 1}.rs`, size: (i + 1) * 3 }));

export default function AppShellPage() {
  return (
    <AppShell
      linkComponent={Link}
      brand={<Brand src={logoInk} darkSrc={logoPaper} width={605} height={256} />}
      homeLabel="ejm-ide home"
      nav={
        <ul>
          {items.map(([label, href], i) => (
            <li key={label}>
              <a href={href} aria-current={i === 0 ? 'page' : undefined} className="touch-target compact-target flex min-h-8 items-center rounded-control px-3 text-sm text-fg no-underline hover:bg-tone aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-2">
                {label}
              </a>
            </li>
          ))}
        </ul>
      }
      actions={<Button asChild variant="ghost"><Link href="/shell/">Shell</Link></Button>}
    >
      <AppFlow>
        <SectionHead purpose="application" as="h1" id="workspace-title" title="Workspace">
          <Text as="p">
            The top bar and the side nav stay while the page scrolls. The nav folds into a labelled disclosure below 768px. Every control here is compact, because the shell sets the density.
          </Text>
        </SectionHead>
        <AppActions>
          <Button>Open a file</Button>
          <Button variant="secondary">Filter</Button>
          <Button variant="ghost">Refresh</Button>
        </AppActions>
        <AppFlow as="section" aria-labelledby="files-title">
          <AppHeading id="files-title">Files</AppHeading>
          <Table label="Files" columns={columns} rows={rows} />
        </AppFlow>
      </AppFlow>
    </AppShell>
  );
}
