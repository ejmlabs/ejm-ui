import { ELEVATIONS, shadowClass } from '../lib/elevation';
import { cn } from '../lib/utils';

/** The three shadow levels, each on a window sample in the page theme. Only product windows, menus and overlays carry them. */
export function Elevations() {
  return (
    <div className="flex flex-wrap gap-10">
      {ELEVATIONS.map(level => (
        <div key={level} className={cn('scheme-page w-full max-w-64 rounded-window bg-ground p-6 text-ui-text', shadowClass[level])}>
          <p className="text-meta">shadow-{level}</p>
        </div>
      ))}
    </div>
  );
}
