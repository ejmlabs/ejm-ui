import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './button';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dialog's accessible name and visible heading. */
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * A modal on the native `<dialog>`. The browser traps focus and makes the page inert, Escape and the backdrop ask to close,
 * and focus goes back to the element that opened it. No portal, no focus-trap library.
 * Page scroll is not locked; a long page behind a dialog can still scroll on some browsers.
 */
export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
      returnTo.current?.focus();
      returnTo.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      // Escape: keep the dialog open until the owner of `open` agrees.
      onCancel={e => { e.preventDefault(); onOpenChange(false); }}
      // A click on the dialog element itself is a click on the backdrop; the content sits in the inner div.
      onClick={e => { if (e.target === ref.current) onOpenChange(false); }}
      // Closed by a form method="dialog" or by the browser: tell the owner.
      onClose={() => { if (open) onOpenChange(false); }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-window border border-line bg-ground p-0 text-fg shadow-float backdrop:bg-ink/50 open:animate-fade"
    >
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-heading">{title}</h2>
          <div className="-me-2 -mt-2 shrink-0">
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
              <X aria-hidden className="size-5" />
            </Button>
          </div>
        </div>
        {description && <p id={descId} className="text-muted">{description}</p>}
        {children}
      </div>
    </dialog>
  );
}
