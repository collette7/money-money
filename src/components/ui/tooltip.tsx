"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function TooltipProvider({
  children,
}: React.PropsWithChildren) {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="tooltip-wrapper">{children}</div>
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean
  }
>(({ asChild, children, className, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      ref,
      className: cn("tooltip-trigger", (children as any).props?.className),
      ...props,
    })
  }
  
  return (
    <button
      ref={ref as any}
      className={cn("tooltip-trigger", className)}
      {...props}
    >
      {children}
    </button>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    sideOffset?: number
    side?: "top" | "right" | "bottom" | "left"
    align?: "start" | "center" | "end"
    hidden?: boolean
  }
>(({ className, side = "top", hidden, children, ...props }, ref) => {
  if (hidden) return null
  
  return (
    <div
      ref={ref}
      className={cn("tooltip__content", `tooltip__content--${side}`, className)}
      role="tooltip"
      {...props}
    >
      {children}
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
