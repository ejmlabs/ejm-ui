import { ProductWindow } from '@ejm/ui/layout/ProductWindow';
import { CodeLines } from './code';
import { cx } from './cx';
import { ideFrame, type IdeFrame } from './frames';
import { ChatLine, Tabs, Tree } from './ide-parts';
import type { ViewProps } from './CliView';

export interface IdeViewProps extends ViewProps {
  frame?: IdeFrame;
  /** stack: the chat only, for small windows (the hero). split: tree, editor and chat side by side, from the window's own width. auto (default) is stack in a stage-sized window and split in a wide one. */
  layout?: 'stack' | 'split' | 'auto';
}

/** The ide frame: the agent's tool calls with the accepted diff, and (split) the edited file beside it. */
export function IdeScreen({ frame, layout = 'auto' }: { frame: IdeFrame; layout?: 'stack' | 'split' | 'auto' }) {
  const split = layout !== 'stack';
  const forced = layout === 'split';
  return (
    <div className={cx('@container h-full min-h-0 leading-[1.45]', layout === 'stack' && 'overflow-hidden @md:[-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)] @md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.2em),transparent)]')}>
      <div className={cx('grid h-full min-h-0 gap-x-[3ch] gap-y-[1em]', split && (forced ? 'grid-cols-[12ch_minmax(0,1fr)_minmax(0,1fr)]' : '@xl:grid-cols-2 @3xl:grid-cols-[12ch_minmax(0,1fr)_minmax(0,1fr)]'))}>
        {split && (
          <div className={cx('min-w-0', !forced && 'hidden @3xl:block')}>
            <p className="m-0 mb-[0.4em] text-ui-dim">Files</p>
            <Tree entries={frame.tree} active={frame.active} />
          </div>
        )}
        {split && (
          <div className={cx('min-w-0', !forced && 'hidden @xl:block')}>
            <Tabs paths={frame.openFiles} active={frame.active} />
            <CodeLines code={frame.file.text} lang={frame.file.lang} changed={frame.changed} className="mt-[0.6em]" />
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-col">
          <Tabs paths={[frame.agent + ' chat']} active={frame.agent + ' chat'} />
          <div className="mt-[0.6em] min-h-0 flex-1 overflow-hidden">
            {frame.chat.map((c) => (
              <ChatLine key={c.id} item={c} agent={frame.agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A representative ejm-ide frame, drawn from the same scenario as the demo: Edi proposed a change, the visitor accepted it, and the editor marks the changed lines. */
export function IdeView({ frame = ideFrame, layout = 'auto', ...window }: IdeViewProps) {
  return (
    <ProductWindow title="ejm-ide" meta={frame.agent} {...window}>
      <IdeScreen frame={frame} layout={layout} />
    </ProductWindow>
  );
}
