import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';

export interface ToastInput {
  title: string;
  description?: string;
  /** One optional action. `altText` tells screen reader users what it does, since the toast may be gone before they reach it. */
  action?: { label: string; altText: string; onClick: () => void };
  /** Milliseconds before it closes. Defaults to the provider's duration. */
  duration?: number;
}

interface ToastApi {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Show and dismiss toasts from anywhere under a ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it.');
  return api;
}

/**
 * Toasts as a polite live region: each one is announced when it appears without taking focus, closes by itself,
 * pauses while hovered or focused, and F8 moves focus to the stack. Toasts are overlays, so they carry the float shadow.
 */
export function ToastProvider({ children, duration = 5000 }: { children: ReactNode; duration?: number }) {
  const [items, setItems] = useState<(ToastInput & { id: string })[]>([]);
  const n = useRef(0);
  const dismiss = useCallback((id: string) => setItems(list => list.filter(t => t.id !== id)), []);
  const toast = useCallback((input: ToastInput) => {
    const id = `toast-${++n.current}`;
    setItems(list => [...list, { ...input, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider duration={duration} swipeDirection="right" label="Notifications">
        {children}
        {items.map(t => (
          <ToastPrimitive.Root
            key={t.id}
            // background means polite: the announcement waits for the screen reader to finish what it is saying.
            type="background"
            duration={t.duration}
            onOpenChange={open => { if (!open) dismiss(t.id); }}
            className="flex items-start gap-4 rounded-window border border-line bg-popover p-4 text-popover-foreground shadow-float animate-reveal"
          >
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="font-semibold">{t.title}</ToastPrimitive.Title>
              {t.description && <ToastPrimitive.Description className="mt-1 text-muted">{t.description}</ToastPrimitive.Description>}
              {t.action && (
                <ToastPrimitive.Action altText={t.action.altText} asChild>
                  <Button variant="link" size="sm" className="mt-2" onClick={t.action.onClick}>{t.action.label}</Button>
                </ToastPrimitive.Action>
              )}
            </div>
            <ToastPrimitive.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Dismiss" className="-me-2 -mt-2 px-3"><X aria-hidden className="size-4" /></Button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-50 m-0 flex list-none flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:inset-x-auto sm:end-0 sm:w-[26rem]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
