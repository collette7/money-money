"use client"

import { useRef, useEffect } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type DialogRootProps = React.ComponentProps<typeof DialogPrimitive.Root>

interface KeyboardDialogProps extends DialogRootProps {
  initialFocusRef?: React.RefObject<HTMLElement | null>
  returnFocusRef?: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function KeyboardDialog({
  initialFocusRef,
  returnFocusRef,
  children,
  className,
  showCloseButton,
  ...props
}: KeyboardDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && props.open) {
        props.onOpenChange?.(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [props.open, props.onOpenChange])

  useEffect(() => {
    if (props.open) {
      const focusElement =
        initialFocusRef?.current ||
        (contentRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement)

      if (focusElement) {
        setTimeout(() => {
          focusElement.focus()
        }, 100)
      }
    } else if (returnFocusRef?.current) {
      returnFocusRef.current.focus()
    }
  }, [props.open, initialFocusRef, returnFocusRef])

  return (
    <Dialog {...props}>
      <DialogContent
        className={cn("outline-none", className)}
        ref={contentRef}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
