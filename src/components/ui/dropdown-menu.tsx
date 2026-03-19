"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { Menu as BaseMenu } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

function DropdownMenu(props: React.ComponentProps<typeof BaseMenu.Root>) {
  return <BaseMenu.Root {...props} />
}

function DropdownMenuPortal(props: React.ComponentProps<typeof BaseMenu.Portal>) {
  return <BaseMenu.Portal {...props} />
}

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger> & {
  asChild?: boolean
}) {
  if (asChild && React.isValidElement(children)) {
    return <BaseMenu.Trigger render={children} {...props} />
  }
  return <BaseMenu.Trigger {...props}>{children}</BaseMenu.Trigger>
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  side = "bottom",
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset} side={side} align={align}>
        <BaseMenu.Popup
          className={cn("dropdown-menu__content", className)}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<typeof BaseMenu.Group>) {
  return <BaseMenu.Group className="dropdown-menu__group" {...props} />
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
}) {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseMenu.Item
        data-inset={inset}
        data-variant={variant}
        className={cn("dropdown-menu__item", className)}
        render={children}
        {...props}
      />
    )
  }
  
  return (
    <BaseMenu.Item
      data-inset={inset}
      data-variant={variant}
      className={cn("dropdown-menu__item", className)}
      {...props}
    >
      {children}
    </BaseMenu.Item>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item> & {
  checked?: boolean
}) {
  return (
    <BaseMenu.Item
      className={cn("dropdown-menu__item", className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <CheckIcon className="size-4" />}
      </span>
      {children}
    </BaseMenu.Item>
  )
}

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <BaseMenu.Group className="dropdown-menu__group">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === DropdownMenuRadioItem) {
          const radioChild = child as React.ReactElement<any>
          return React.cloneElement(radioChild, {
            checked: radioChild.props.value === value,
            onClick: () => onValueChange?.(radioChild.props.value),
          })
        }
        return child
      })}
    </BaseMenu.Group>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  checked,
  value,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item> & {
  checked?: boolean
  value: string
}) {
  return (
    <BaseMenu.Item
      className={cn("dropdown-menu__item", className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <CircleIcon className="size-2 fill-current" />}
      </span>
      {children}
    </BaseMenu.Item>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean
}) {
  return (
    <div
      data-inset={inset}
      className={cn("dropdown-menu__label", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Separator>) {
  return (
    <BaseMenu.Separator
      className={cn("dropdown-menu__separator", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("dropdown-menu__shortcut", className)}
      {...props}
    />
  )
}

function DropdownMenuSub(props: React.ComponentProps<typeof BaseMenu.Root>) {
  return <BaseMenu.Root {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger> & {
  inset?: boolean
}) {
  return (
    <BaseMenu.Trigger
      data-inset={inset}
      className={cn("dropdown-menu__sub-trigger", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </BaseMenu.Trigger>
  )
}

function DropdownMenuSubContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup> & {
  sideOffset?: number
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset}>
        <BaseMenu.Popup
          className={cn("dropdown-menu__sub-content", className)}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
