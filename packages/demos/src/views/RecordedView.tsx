import type { ReactNode, Ref } from 'react';
import { Btn } from '../islands/btn';

/** A read-only recorded surface. Controls stay outside the product output. */
export function RecordedView({ name, playback = 'idle', paused = false, onPause, onRestart, host, children }: {
  name: string;
  playback?: 'idle' | 'running' | 'completed';
  paused?: boolean;
  onPause?: () => void;
  onRestart?: () => void;
  host?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div ref={host} data-showcase={name} data-playback={playback} role="group" aria-label={`${name} recorded playback`} className="scheme-page @container flex min-w-0 flex-col gap-4 text-ui-text">
      <div className="aspect-[4/5] min-h-0 overflow-hidden font-mono text-[length:var(--ejm-window-text,0.8125rem)] @md:aspect-[16/10]">{children}</div>
      <div className="flex flex-wrap gap-2">
        <Btn aria-label={`${paused ? 'Resume' : 'Pause'} ${name} playback`} disabled={!onPause || playback !== 'running'} onClick={onPause}>{paused ? 'Resume' : 'Pause'}</Btn>
        <Btn aria-label={`Restart ${name} playback`} disabled={!onRestart} onClick={onRestart}>Restart</Btn>
      </div>
    </div>
  );
}
