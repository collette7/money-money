import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slot } from "@/lib/utils/slot"

type EmptyStateAction = {
  label: string
  asChild?: boolean
  children?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "sm" | "default" | "lg" | "icon-xs" | "icon"
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  actions?: EmptyStateAction[]
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed gap-2",
        className
      )}
    >
      <div className="bg-muted text-muted-foreground rounded-full p-3 mb-2">
        {icon}
      </div>
      <h3 className="font-medium text-lg">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md">{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {actions.map(({ label, children, asChild, ...buttonProps }, index) => {
            if (asChild && React.isValidElement(children)) {
              return React.cloneElement(children as any, { key: index })
            }
            
            return (
              <Button key={index} {...buttonProps}>
                {children ?? label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
