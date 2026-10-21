import { useLayoutEffect, useRef } from 'react';
import { HarnessScreen } from '../previews/HarnessView';
import { harnessTerminalClass } from '../previews/harness-parts';
import { source, create } from '../previews/harness';
import { validatePreviewRecording } from '../previews/recording';
import type { HarnessFrame } from '../previews/frames';
import { RecordedIsland } from './RecordedIsland';
function Frame({ frame }: { frame: HarnessFrame }) {
  const terminal = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const el = terminal.current; if (el) el.scrollTop = el.scrollHeight; }, [frame.output]);
  return <div data-band="paper" className={harnessTerminalClass}><div ref={terminal} className="min-h-0 flex-1 overflow-hidden"><HarnessScreen frame={frame} /></div></div>;
}
const renderFrame = (frame: HarnessFrame) => <Frame frame={frame} />;
export default function HarnessPreview() { return <RecordedIsland name="ejm-harness" source={source} create={create} validate={validatePreviewRecording} renderFrame={renderFrame} />; }
