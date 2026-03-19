"use client"

import * as React from "react"
import { Popover as BasePopover } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover(props: React.ComponentProps<typeof BasePopover.Root>) {
  return <BasePopover.Root {...props} />
}

function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof BasePopover.Trigger> & {
  asChild?: boolean
}) {
  if (asChild && React.isValidElement(children)) {
    return <BasePopover.Trigger render={children} {...props} />
  }
  return <BasePopover.Trigger {...props}>{children}</BasePopover.Trigger>
}

function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  align?: "center" | "start" | "end"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset} side={side} align={align}>
        <BasePopover.Popup
          className={cn("popover__content", className)}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}



function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
}
