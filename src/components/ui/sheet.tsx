"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Drawer as BaseDrawer } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

function Sheet(props: React.ComponentProps<typeof BaseDrawer.Root>) {
  return <BaseDrawer.Root {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof BaseDrawer.Trigger>) {
  return <BaseDrawer.Trigger {...props} />
}

function SheetClose(props: React.ComponentProps<typeof BaseDrawer.Close>) {
  return <BaseDrawer.Close {...props} />
}

function SheetPortal(props: React.ComponentProps<typeof BaseDrawer.Portal>) {
  return <BaseDrawer.Portal {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Backdrop>) {
  return (
    <BaseDrawer.Backdrop
      className={cn("drawer__overlay", className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Popup> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const sideClass = `drawer__content--${side}`
  
  return (
    <SheetPortal>
      <SheetOverlay />
      <BaseDrawer.Popup
        className={cn("drawer__content", sideClass, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <BaseDrawer.Close className="drawer__close">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </BaseDrawer.Close>
        )}
      </BaseDrawer.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("drawer__header", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("drawer__footer", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Title>) {
  return (
    <BaseDrawer.Title
      className={cn("drawer__title", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Description>) {
  return (
    <BaseDrawer.Description
      className={cn("drawer__description", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
