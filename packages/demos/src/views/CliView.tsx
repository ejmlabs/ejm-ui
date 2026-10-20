import { ProductWindow, type ProductWindowProps } from '@ejm/ui/layout/ProductWindow';
import { cx } from './cx';
import { cliFrame, type CliFrame } from './frames';
import { CliHeader, CliHints, CliStatus, TermBlock, glyphsFor } from './terminal';

export type ViewProps = Pick<ProductWindowProps, 'elevation' | 'labelSide' | 'label' | 'className'>;

/** The terminal screen of one ejm-cli frame: header, transcript (newest at the bottom), status line, composer and key hints. */
/** In a stage window (compact) the status line and key hints are left out and the transcript fades where it is cut, so no line is shown half drawn. */
export function CliScreen({ frame, plain = false, compact = false }: { frame: CliFrame; plain?: boolean; compact?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col leading-[1.45]">
      <CliHeader provider={frame.provider} title={frame.title} write={frame.write} shell={frame.shell} cwd={frame.cwd} sessionId={frame.sessionId} plain={plain} />
      {/* justify-end keeps the newest lines in view when the window is shorter than the transcript, like a terminal that has scrolled. */}
      <div className={cx('flex min-h-0 flex-1 flex-col overflow-hidden pt-[0.7em]', compact ? 'justify-start @md:[-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)] @md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)]' : 'justify-end')}>
        {frame.blocks.map((b) => (
          <TermBlock key={b.id} block={b} plain={plain} />
        ))}
      </div>
      <div className="shrink-0 border-t border-ui-line pt-[0.4em]">
        {!compact && <CliStatus agents={frame.agents} models={frame.models} tools={frame.tools} plain={plain} />}
        <div className={cx('whitespace-pre', plain ? 'font-bold' : 'text-ui-accent')}>
          {glyphsFor(plain).prompt + ' '}
          <span className={plain ? 'font-normal' : 'text-ui-dim'}>{'Describe a task' + glyphsFor(plain).dots}</span>
        </div>
        {!compact && <CliHints hints={frame.hints} plain={plain} />}
      </div>
    </div>
  );
}

/** A representative ejm-cli frame: a patch is proposed and blocked because write access is off. Drawn from the same scenario as the demo. Shows the "Simulated screen" label. */
export function CliView({ frame = cliFrame, compact = false, ...window }: ViewProps & { frame?: CliFrame; compact?: boolean }) {
  return (
    <ProductWindow title="ejm-cli" meta="terminal" {...window}>
      <CliScreen frame={frame} compact={compact} />
    </ProductWindow>
  );
}
