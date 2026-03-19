"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Toast as BaseToast } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"

function ToastProvider(props: React.ComponentProps<typeof BaseToast.Provider>) {
  return <BaseToast.Provider {...props} />
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof BaseToast.Viewport>) {
  return (
    <BaseToast.Viewport
      className={cn("toast__viewport", className)}
      {...props}
    />
  )
}

const Toast = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ className, open = true, onOpenChange, ...props }, ref) => {
  if (!open) return null
  
  return (
    <div
      ref={ref}
      className={cn("toast", className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      {props.children}
    </div>
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn("toast__action", className)}
      {...props}
    />
  )
})
ToastAction.displayName = "ToastAction"

const ToastTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<"h3">
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn("toast__title", className)}
      {...props}
    />
  )
})
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("toast__description", className)}
      {...props}
    />
  )
})
ToastDescription.displayName = "ToastDescription"

const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, children, onClick, ...props }, ref) => {
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    const toastElement = e.currentTarget.closest('.toast')
    if (toastElement) {
      toastElement.remove()
    }
  }, [onClick])
  
  return (
    <button
      ref={ref}
      type="button"
      className={cn("toast__close", className)}
      onClick={handleClick}
      {...props}
    >
      {children || <XIcon className="toast__close-icon" />}
    </button>
  )
})
ToastClose.displayName = "ToastClose"

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
