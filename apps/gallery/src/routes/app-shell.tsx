import { Link } from '@ejm/ssg';
import logoInk from '@ejm/tokens/assets/projects/ide/logo-ink.svg?url';
import logoPaper from '@ejm/tokens/assets/projects/ide/logo-paper.svg?url';
import { AppActions, AppFlow, AppHeading, AppShell, Brand, Button, SectionHead, Table, Text } from '@ejm/ui';

// AppShell is a whole page frame (top bar, side nav, content), so it has its own route. It makes every control inside compact.

const nav = [
  { label: 'Files', href: '#files', current: true },
  { label: 'Search', href: '#search' },
  { label: 'Agent', href: '#agent' },
  { label: 'Settings', href: '#settings' },
];

const columns = [{ key: 'file', label: 'File' }, { key: 'size', label: 'Size (KB)' }];
const rows = Array.from({ length: 12 }, (_, i) => ({ file: `src/module-${i + 1}.rs`, size: (i + 1) * 3 }));

export default function AppShellPage() {
  return (
    <AppShell
      linkComponent={Link}
      brand={<Brand src={logoInk} darkSrc={logoPaper} width={605} height={256} />}
      homeLabel="ejm-ide home"
      nav={nav}
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
