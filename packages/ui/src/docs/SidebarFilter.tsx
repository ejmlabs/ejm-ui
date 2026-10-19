import { useId, type KeyboardEvent } from 'react';
import { cn } from '../lib/utils';
import { useHydrated } from './hooks';

/**
 * The search box for a sidebar. The parent owns the query and filters its list (use `filterList` from @ejm/core, whose
 * `announcement` is the text to pass as `status`). The box is in the server HTML but hidden, and shown once scripts run,
 * so a visitor with no script never sees a control that cannot work and still gets the whole list.
 *
 * Escape clears the box. `status` is spoken politely in a live region as the result changes.
 */
export function SidebarFilter({
  value,
  onChange,
  status,
  label = 'Filter pages',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  status: string;
  label?: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  const id = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && value) {
      event.preventDefault();
      onChange('');
    }
  };
  return (
    <div hidden={!hydrated} className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'focus-ring min-h-11 w-full rounded-control border border-control bg-field px-3 text-[0.9375rem] text-fg placeholder:text-muted',
        )}
      />
      <p role="status" className="mt-2 min-h-5 text-meta text-muted">
        {status}
      </p>
    </div>
  );
}
