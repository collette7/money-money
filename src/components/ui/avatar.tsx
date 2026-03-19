"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    size?: "default" | "sm" | "lg"
  }
>(({ className, size = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="avatar"
      data-size={size}
      className={cn("avatar", `avatar--${size}`, className)}
      {...props}
    />
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<"img">
>(({ className, alt, ...props }, ref) => {
  return (
    <img
      ref={ref}
      alt={alt}
      data-slot="avatar-image"
      className={cn("avatar__image", className)}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="avatar-fallback"
      className={cn("avatar__fallback", className)}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

const AvatarBadge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      data-slot="avatar-badge"
      className={cn("avatar__badge", className)}
      {...props}
    />
  )
})
AvatarBadge.displayName = "AvatarBadge"

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="avatar-group"
      className={cn("avatar-group", className)}
      {...props}
    />
  )
})
AvatarGroup.displayName = "AvatarGroup"

const AvatarGroupCount = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="avatar-group-count"
      className={cn("avatar-group__count", className)}
      {...props}
    />
  )
})
AvatarGroupCount.displayName = "AvatarGroupCount"

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
