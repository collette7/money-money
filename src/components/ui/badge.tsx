import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: BadgeVariant
  asChild?: boolean
}

const getBadgeClasses = (variant: BadgeVariant = "default") => {
  const baseClasses = "badge"
  
  const variantClasses = {
    default: "badge--default",
    secondary: "badge--secondary",
    destructive: "badge--destructive",
    outline: "badge--outline",
  }
  
  return cn(baseClasses, variantClasses[variant])
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  children,
  ...props
}: BadgeProps) {
  const badgeClasses = getBadgeClasses(variant)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(badgeClasses, className),
      "data-variant": variant,
      ...props,
    })
  }
  
  return (
    <span
      className={cn(badgeClasses, className)}
      data-variant={variant}
      {...props}
    >
      {children}
    </span>
  )
}

const badgeVariants = getBadgeClasses

export { Badge, badgeVariants }
