"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      className={cn("checkbox", className)}
      {...props}
    >
      <BaseCheckbox.Indicator className="checkbox__indicator">
        <CheckIcon className="size-3.5" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )
}

export { Checkbox }
