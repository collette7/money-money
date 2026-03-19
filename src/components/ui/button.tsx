import * as React from "react"
import { Button as BaseButton } from "@base-ui/react/button"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

interface ButtonProps extends React.ComponentProps<typeof BaseButton> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const getButtonClasses = (variant: ButtonVariant = "default", size: ButtonSize = "default") => {
  const baseClasses = "button"
  
  const variantClasses = {
    default: "button--primary",
    destructive: "button--destructive",
    outline: "button--outline",
    secondary: "button--secondary",
    ghost: "button--ghost",
    link: "button--link",
  }
  
  const sizeClasses = {
    default: "button--size-default",
    xs: "button--size-xs",
    sm: "button--size-sm",
    lg: "button--size-lg",
    icon: "button--size-icon",
    "icon-xs": "button--size-icon-xs",
    "icon-sm": "button--size-icon-sm",
    "icon-lg": "button--size-icon-lg",
  }
  
  return cn(baseClasses, variantClasses[variant], sizeClasses[size])
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const buttonClasses = getButtonClasses(variant, size)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(buttonClasses, className),
      ...props,
    })
  }
  
  return (
    <BaseButton
      className={cn(buttonClasses, className)}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </BaseButton>
  )
}

const buttonVariants = getButtonClasses

export { Button, buttonVariants }
