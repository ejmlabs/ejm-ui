import { useId, type KeyboardEvent } from 'react';
import { fieldClass } from '../control-recipes.mjs';
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
}: {
  value: string;
  onChange: (value: string) => void;
  status: string;
  label?: string;
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
    <div hidden={!hydrated} className="mb-6">
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
        // The field recipe of Input. The sidebar scrolls, so the focus outline goes inside the box.
        className={`${fieldClass} focus-visible:outline-offset-[-2px]`}
      />
      <p role="status" className="mt-2 min-h-5 text-meta text-muted">
        {status}
      </p>
    </div>
  );
}
