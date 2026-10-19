import { Fact, Facts, ProductWindow, Status, Text } from '@ejm/ui';

// The three product windows of the layout page and the home page. Words come from the ejmlabs project READMEs; each window is labelled "Simulated screen".

export function Cli() {
  return (
    <ProductWindow title="ejm-cli" meta="terminal" elevation="rest" labelSide="start">
      <p className="m-0 whitespace-nowrap"><Text variant="muted">$</Text> ejm-cli --replay run "Hello"</p>
      <p className="m-0 whitespace-nowrap">Demo: Hello</p>
      <p className="mt-4 mb-0 whitespace-nowrap"><Text variant="muted">$</Text> ejm-cli sessions</p>
      <p className="mt-4 mb-0"><Status status="info" label="read only by default" /></p>
      <p className="m-0 whitespace-nowrap"><Text variant="muted">--allow-write grants writing</Text></p>
      <p className="mt-4 mb-0 whitespace-nowrap"><Text variant="muted">$</Text> ejm-cli doctor</p>
    </ProductWindow>
  );
}

export function Ide() {
  return (
    <ProductWindow title="ejm-ide" meta="Edi" elevation="raised">
      <p className="m-0 text-ui-text-strong">Edi</p>
      <p className="m-0 whitespace-nowrap text-ui-text-muted">Tool call</p>
      <p className="m-0 whitespace-nowrap"><Status status="ok" label="read_file" /></p>
      <p className="m-0 whitespace-nowrap"><Status status="ok" label="write_file" /></p>
      <p className="mt-3 mb-0 whitespace-nowrap bg-ui-diff-del-bg text-ui-diff-del">- let now = Instant::now();</p>
      <p className="m-0 whitespace-nowrap bg-ui-diff-add-bg text-ui-diff-add">+ let now = clock.now();</p>
    </ProductWindow>
  );
}

export function Harness() {
  return (
    <ProductWindow title="ejm-harness" meta="governor" elevation="float">
      <p className="m-0 text-ui-text-strong">Resource governor</p>
      <Facts className="mt-3">
        <Fact label="sessions" className="py-2">100</Fact>
        <Fact label="model requests" className="py-2">8</Fact>
        <Fact label="local jobs" className="py-2">4</Fact>
        <Fact label="heavy job" className="py-2">1</Fact>
      </Facts>
      <p className="mt-3 mb-0"><Status status="ok" label="event journal" /></p>
    </ProductWindow>
  );
}
