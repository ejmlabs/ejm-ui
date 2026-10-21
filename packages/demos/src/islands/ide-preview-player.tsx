import { useTheme } from '@ejm/ui/hooks/useTheme';
import { IdeScreen } from '../previews/IdeView';
import { source, create, type Surface } from '../previews/ide';
import { validatePreviewRecording } from '../previews/recording';
import { RecordedIsland } from './RecordedIsland';
function Frame({ surface }: { surface: Surface }) {
  const theme = useTheme().resolved;
  return <div data-theme={theme} className="h-full min-h-0"><IdeScreen frame={surface.frame} running={surface.running} folders={surface.folders} flash={surface.flash ?? undefined} passive /></div>;
}
const renderFrame = (surface: Surface) => <Frame surface={surface} />;
export default function IdePreview() { return <RecordedIsland name="ejm-ide" source={source} create={create} validate={validatePreviewRecording} renderFrame={renderFrame} />; }
