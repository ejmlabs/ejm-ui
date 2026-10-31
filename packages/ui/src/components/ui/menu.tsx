import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';
import { cn } from '../../lib/utils';

/** A dropdown menu on Radix: arrows, Home and End, typeahead, Escape, and focus back to the trigger. */
export const Menu = MenuPrimitive.Root;

export function MenuTrigger(props: Closed<ComponentProps<typeof MenuPrimitive.Trigger>>) {
  return <MenuPrimitive.Trigger {...props} />;
}

export function MenuGroup(props: Closed<ComponentProps<typeof MenuPrimitive.Group>>) {
  return <MenuPrimitive.Group {...props} />;
}

export interface MenuContentProps extends Closed<ComponentProps<typeof MenuPrimitive.Content>> {
  /** Where to portal the menu. Defaults to document.body. */
  container?: HTMLElement | null;
}

/** The floating list: an overlay, so it has the window radius, a line border, the float shadow and the fade. */
export function MenuContent({ container, sideOffset = 8, align = 'start', loop = true, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        loop={loop}
        collisionPadding={16}
        {...props}
        className="z-50 min-w-48 max-w-[calc(100vw-2rem)] rounded-window border border-line bg-ground p-1.5 text-fg shadow-float animate-fade"
      />
    </MenuPrimitive.Portal>
  );
}

export interface MenuItemProps extends Closed<ComponentProps<typeof MenuPrimitive.Item>> {
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/** A 44px row (32px compact). The window rounds and insets its rows, so the focus outline is drawn inside the row instead of outside it. */
export function MenuItem({ density, ...props }: MenuItemProps) {
  const compact = useDensity(density) === 'compact';
  return (
    <MenuPrimitive.Item
      {...props}
      className={cn(
        'flex cursor-pointer select-none items-center gap-3 rounded-control px-3 touch-target focus-visible:outline-offset-[-2px] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-tone',
        compact ? 'min-h-8 compact-target text-sm' : 'min-h-11 text-base',
      )}
    />
  );
}

export function MenuLabel(props: Closed<ComponentProps<typeof MenuPrimitive.Label>>) {
  return <MenuPrimitive.Label {...props} className="px-3 py-1.5 text-meta text-muted" />;
}

export function MenuSeparator(props: Closed<ComponentProps<typeof MenuPrimitive.Separator>>) {
  return <MenuPrimitive.Separator {...props} className="my-1.5 h-px bg-line" />;
}
