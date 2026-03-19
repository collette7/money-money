"use client"

import * as React from "react"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

interface TabsProps extends React.ComponentProps<typeof BaseTabs.Root> {
  orientation?: "horizontal" | "vertical"
}

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  return (
    <BaseTabs.Root
      orientation={orientation}
      className={cn("tabs", className)}
      {...props}
    />
  )
}

interface TabsListProps extends React.ComponentProps<typeof BaseTabs.List> {
  variant?: "default" | "line"
}

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsListProps) {
  const variantClass = variant === "line" ? "tabs__list--line" : "tabs__list--default"
  
  return (
    <BaseTabs.List
      data-variant={variant}
      className={cn("tabs__list", variantClass, className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn("tabs__trigger", className)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      className={cn("tabs__content", className)}
      {...props}
    />
  )
}

const tabsListVariants = (variant: "default" | "line" = "default") => {
  return variant === "line" ? "tabs__list tabs__list--line" : "tabs__list tabs__list--default"
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
