import * as React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  const orientationClass = orientation === "vertical" ? "separator--vertical" : "separator--horizontal"
  
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn("separator", orientationClass, className)}
      {...props}
    />
  )
}

export { Separator }
