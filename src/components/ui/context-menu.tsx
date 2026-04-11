"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, CheckIcon } from "lucide-react";

/* ROOT */

export function ContextMenu(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Root>,
) {
  return <ContextMenuPrimitive.Root {...props} />;
}
   
/* TRIGGER */

export function ContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>,
) {
  return <ContextMenuPrimitive.Trigger {...props} />;
}

/* CONTENT */

export function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-50 min-w-[180px] overflow-hidden rounded-md border bg-slate-900 text-slate-200 shadow-md",
          "animate-in fade-in-0 zoom-in-95",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

/* ITEM */

export function ContextMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus:bg-indigo-500/20 focus:text-indigo-300",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

/* CHECKBOX */

export function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex items-center rounded-sm py-1.5 pl-2 pr-8 text-sm",
        "focus:bg-indigo-500/20",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

/* RADIO */

export function ContextMenuRadioGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>,
) {
  return <ContextMenuPrimitive.RadioGroup {...props} />;
}

export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        "relative flex items-center rounded-sm py-1.5 pl-2 pr-8 text-sm",
        "focus:bg-indigo-500/20",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

/* SUB MENU */

export function ContextMenuSub(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>,
) {
  return <ContextMenuPrimitive.Sub {...props} />;
}

export function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      className={cn(
        "flex items-center rounded-sm px-2 py-1.5 text-sm",
        "focus:bg-indigo-500/20",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      className={cn(
        "z-50 min-w-[180px] rounded-md border bg-slate-900 shadow-md",
        className,
      )}
      {...props}
    />
  );
}

/* SEPARATOR */

export function ContextMenuSeparator(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Separator>,
) {
  return (
    <ContextMenuPrimitive.Separator
      className="my-1 h-px bg-slate-700"
      {...props}
    />
  );
}
