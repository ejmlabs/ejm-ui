// Runs one agent through the real ejm-harness TypeScript SDK and prints what the engine recorded:
// the durable event journal of the run, then the shared governor and harness status.
// Every value printed comes from the Rust worker. This script only formats it, one line per event.
//
// Usage: node journal.mjs
// Reads EJM_HARNESS_DIR (the ejm-harness checkout), EJM_WORKSPACE (the project the agent works in),
// EJM_STATE_DIR (where the journal is stored) and EJM_RESPONSES (a JSON array of scripted model responses).
// The ejm-harness-worker binary must be on PATH or named by EJM_HARNESS_WORKER_PATH.
const { EJM_HARNESS_DIR: harnessDir, EJM_WORKSPACE: workspace, EJM_STATE_DIR: stateDir, EJM_RESPONSES: responsesFile } = process.env;
const { Harness } = await import(`${harnessDir}/sdk/typescript/dist/index.js`);
const { readFileSync } = await import('node:fs');

const harness = await Harness.create({
  state_dir: stateDir,
  provider: { kind: 'replay', responses: JSON.parse(readFileSync(responsesFile, 'utf8')) },
});
try {
  const session = await harness.createSession({ cwd: workspace, title: 'order service' });
  const run = await session.start('Add request logging to the order service');
  const result = await run.wait();

  const short = (v, n = 52) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const describe = e => {
    switch (e.type) {
      case 'run_started': return short(e.prompt);
      case 'model_started': return `step ${e.step}`;
      case 'tool_queued': case 'tool_started': return `${e.call.name} ${short(e.call.arguments)}`;
      case 'tool_finished': return `${e.output.is_error ? 'error' : 'ok'} ${short(e.output.content.replace(/\s+/g, ' '))}`;
      case 'text_delta': return short(e.text);
      case 'usage': return short(e.usage);
      case 'run_finished': return `${e.summary.status}, ${e.summary.steps} steps`;
      default: return '';
    }
  };
  const events = await session.events();
  console.log(`session ${session.id.slice(0, 8)}  ${events.length} events in the journal\n`);
  const t0 = events[0]?.timestamp_ms ?? 0;
  for (const e of events) {
    console.log(`${String(e.sequence).padStart(3)}  ${`+${e.timestamp_ms - t0}ms`.padStart(6)}  ${e.type.padEnd(14)} ${describe(e)}`);
  }
  console.log(`\nrun ${result.status}`);
  const g = await harness.governor();
  const h = await harness.status();
  console.log(`governor  running ${g.running}  queued ${g.queued}  heavy ${g.heavy_running}  reserved: cpu ${g.reserved_cpu_millis}m  mem ${g.reserved_memory_bytes} B  output ${g.reserved_output_bytes} B  procs ${g.reserved_processes}`);
  console.log(`harness   agents ${h.active_agents}  model requests ${h.model_requests}  waiting ${h.waiting_model_requests}  tools running ${h.tools.running}`);
} finally {
  await harness.close();
}
