import type { RefObject } from 'react';
import type { ProductWindowProps } from '@ejm/ui/layout/ProductWindow';
import { cx } from './cx';
import { cliFrame } from './frames/cli';
import type { CliFrame } from './frames';
import { CliHeader, CliHints, CliStatus, TermBlock, glyphsFor } from './terminal';

/** Layout options kept for existing consumers. Product surfaces draw their own chrome. */
export type ViewProps = Pick<ProductWindowProps, 'elevation' | 'labelSide' | 'label' | 'className'>;

/** Native TUI hierarchy: header, transcript, status, bordered composer and key hints. */
export function CliScreen({ frame, plain = false, transcript }: { frame: CliFrame; plain?: boolean; compact?: boolean; transcript?: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="flex h-full min-h-0 flex-col leading-[1.45]">
      <CliHeader provider={frame.provider} title={frame.title} write={frame.write} shell={frame.shell} cwd={frame.cwd} sessionId={frame.sessionId} plain={plain} />
      <div ref={transcript} className="min-h-0 flex-1 overflow-hidden pt-[0.7em]"><div className="flex min-h-full flex-col justify-end">
        {frame.blocks.map((block) => <TermBlock key={block.id} block={block} plain={plain} />)}
      </div>
      </div>
      <div className="shrink-0">
        <CliStatus agents={frame.agents} models={frame.models} tools={frame.tools} plain={plain} />
        <div className={cx('my-[0.2em] border border-ui-line-strong px-[2ch] py-[0.4em] whitespace-pre', plain ? 'font-bold' : 'text-ui-accent')}>
          {glyphsFor(plain).prompt + ' '}<span className={plain ? 'font-normal' : 'text-ui-dim'}>{'Describe a task' + glyphsFor(plain).dots}</span>
        </div>
        <CliHints hints={frame.hints} plain={plain} />
      </div>
    </div>
  );
}

/** A static moment from the local scenario, without added demo chrome. */
export function CliView({ frame = cliFrame, label = 'ejm-cli', className }: ViewProps & { frame?: CliFrame; compact?: boolean }) {
  return <div role="group" aria-label={label} className={cx('ejm-cli-surface h-full min-h-0 bg-ui-ground p-[1em] font-mono text-[12px] text-ui-text', className)}><CliScreen frame={frame} /></div>;
}
