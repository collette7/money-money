"use client"

import * as React from "react"
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root
      className={cn("scroll-area", className)}
      {...props}
    >
      <BaseScrollArea.Viewport className="scroll-area__viewport">
        {children}
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <BaseScrollArea.Corner className="scroll-area__corner" />
    </BaseScrollArea.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return (
    <BaseScrollArea.Scrollbar
      orientation={orientation}
      className={cn("scroll-area__scrollbar", `scroll-area__scrollbar--${orientation}`, className)}
      {...props}
    >
      <BaseScrollArea.Thumb className="scroll-area__thumb" />
    </BaseScrollArea.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
