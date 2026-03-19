"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>({})

function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  open,
  onOpenChange,
  disabled,
  name,
}: {
  children: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  name?: string
}) {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || '')
  const [isOpen, setIsOpen] = React.useState(false)
  
  const actualValue = value !== undefined ? value : selectedValue
  const actualOpen = open !== undefined ? open : isOpen
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setSelectedValue(newValue)
    }
    onValueChange?.(newValue)
    handleOpenChange(false)
  }, [value, onValueChange])
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (open === undefined) {
      setIsOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [open, onOpenChange])
  
  return (
    <SelectContext.Provider 
      value={{ 
        value: actualValue, 
        onValueChange: handleValueChange,
        open: actualOpen,
        onOpenChange: handleOpenChange
      }}
    >
    <div className="select" data-disabled={disabled}>
      {children}
      {name && (
        <input type="hidden" name={name} value={actualValue} />
      )}
    </div>
    </SelectContext.Provider>
  )
}

function SelectGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("select__group", className)} {...props} />
  )
}

function SelectValue({
  placeholder,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  placeholder?: React.ReactNode
}) {
  const { value } = React.useContext(SelectContext)
  
  return (
    <span className={cn("select__value", className)} {...props}>
      {value || placeholder}
    </span>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    size?: "sm" | "default"
  }
>(({ className, size = "default", children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(SelectContext)
  const sizeClass = size === "sm" ? "select__trigger--sm" : "select__trigger--default"
  
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn("select__trigger", sizeClass, className)}
      onClick={() => onOpenChange?.(!open)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="select__trigger-icon" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    position?: "item-aligned" | "popper"
  }
>(({ className, children, position = "popper", ...props }, ref) => {
  const { open } = React.useContext(SelectContext)
  
  if (!open) return null
  
  return (
    <div className="select__portal">
      <div
        ref={ref}
        className={cn("select__content", className)}
        {...props}
      >
        <div className="select__viewport">
          {children}
        </div>
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("select__label", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    value: string
  }
>(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = React.useContext(SelectContext)
  const isSelected = selectedValue === value
  
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      className={cn("select__item", className)}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      <span className="select__item-indicator">
        {isSelected && <CheckIcon className="select__item-check" />}
      </span>
      <span className="select__item-text">{children}</span>
    </div>
  )
})
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("select__separator", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}