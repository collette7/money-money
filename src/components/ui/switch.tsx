"use client"

import * as React from "react"
import { Switch as BaseSwitch } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentProps<typeof BaseSwitch.Root> {
  size?: "sm" | "default"
}

function Switch({
  className,
  size = "default",
  ...props
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={cn("switch", className)}
      data-size={size}
      {...props}
    >
      <BaseSwitch.Thumb className="switch__thumb" />
    </BaseSwitch.Root>
  )
}

export { Switch }
