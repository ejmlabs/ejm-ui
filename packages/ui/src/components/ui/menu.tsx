import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** A dropdown menu on Radix: arrows, Home and End, typeahead, Escape, and focus back to the trigger. */
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;

export interface MenuContentProps extends ComponentProps<typeof MenuPrimitive.Content> {
  /** Where to portal the menu. Defaults to document.body. */
  container?: HTMLElement | null;
}

/** The floating list. Menus are one of the few things that float, so this one has the float shadow. */
export function MenuContent({ className, container, sideOffset = 8, align = 'start', loop = true, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        loop={loop}
        collisionPadding={16}
        className={cn('z-50 min-w-48 max-w-[calc(100vw-2rem)] rounded-window border border-line bg-popover p-1.5 text-popover-foreground shadow-float animate-fade', className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn('touch-target flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-control px-3 text-base outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-tone', className)}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('px-3 py-1.5 text-meta text-muted', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('my-1.5 h-px bg-line', className)} {...props} />;
}
