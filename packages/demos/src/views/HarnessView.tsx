import { ProductWindow } from '@ejm/ui/layout/ProductWindow';
import { cx } from './cx';
import { Syntax } from './code';
import { harnessFrame, type HarnessFrame } from './frames';
import { Governor, JournalLine, SessionRow } from './harness-parts';
import type { ViewProps } from './CliView';

export interface HarnessViewProps extends ViewProps {
  frame?: HarnessFrame;
  /** stack: governor, sessions and journal in one column (the hero). split: governor and sessions beside the journal, with the Rust sample below. auto: split in a wide window. */
  layout?: 'stack' | 'split' | 'auto';
}

export function HarnessScreen({ frame, layout = 'auto' }: { frame: HarnessFrame; layout?: 'stack' | 'split' | 'auto' }) {
  const forced = layout === 'split';
  const wide = layout !== 'stack';
  return (
    <div className={cx('@container h-full min-h-0 leading-[1.45]', layout === 'stack' && 'overflow-hidden @md:[-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)] @md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)]')}>
      <div className={forced ? 'grid grid-cols-2 gap-x-[4ch] gap-y-[1.2em]' : wide ? 'grid gap-x-[4ch] gap-y-[1.2em] @2xl:grid-cols-2' : 'grid gap-y-[0.8em]'}>
        <div className="min-w-0">
          <Governor limit={frame.limit} commands={frame.commands} stats={frame.stats} />
          <ul aria-label="Sessions" className="m-0 mt-[0.4em] list-none p-0">
            {frame.sessions.slice(0, wide ? undefined : 3).map((s) => (
              <SessionRow key={s.id} s={s} detail={wide} />
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <p className="m-0 mb-[0.2em] font-bold text-ui-text-strong">Journal <span className="font-normal text-ui-dim">append only</span></p>
          <ul aria-label="Journal" className="m-0 list-none p-0">
            {frame.journal.slice(wide ? 0 : -3).map((e) => (
              <JournalLine key={e.seq} e={e} />
            ))}
          </ul>
        </div>
        {wide && (
          <div className={forced ? 'col-span-2 min-w-0' : 'min-w-0 @2xl:col-span-2'}>
            <p className="m-0 mb-[0.2em] text-ui-dim">{frame.sample.label}: {frame.sample.caption}</p>
            <pre className="m-0 overflow-hidden whitespace-pre font-[inherit] text-[length:inherit]"><code><Syntax code={frame.sample.code} lang={frame.sample.id} /></code></pre>
          </div>
        )}
      </div>
    </div>
  );
}

/** A representative ejm-harness frame, drawn from the same scenario as the demo: sessions recovering from the journal after a crash. */
export function HarnessView({ frame = harnessFrame, layout = 'auto', ...window }: HarnessViewProps) {
  return (
    <ProductWindow title="ejm-harness" meta="governor" {...window}>
      <HarnessScreen frame={frame} layout={layout} />
    </ProductWindow>
  );
}
