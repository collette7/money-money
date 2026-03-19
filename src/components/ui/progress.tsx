"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    value?: number
    max?: number
  }
>(({ className, value = 0, max = 100, ...props }, ref) => {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100)
  
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      data-slot="progress"
      className={cn("progress", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="progress__indicator"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
})
Progress.displayName = "Progress"

export { Progress }
