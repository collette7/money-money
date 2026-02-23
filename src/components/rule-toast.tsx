"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

interface RuleToastProps {
  categoryName: string
  onAddRule: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RuleToast({ categoryName, onAddRule, open, onOpenChange }: RuleToastProps) {
  return (
    <ToastProvider>
      <Toast open={open} onOpenChange={onOpenChange} className="max-w-md">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 text-primary p-1.5">
            <Info className="size-5" />
          </div>
          <div className="grid gap-1">
            <ToastTitle className="font-semibold">Add rule for similar transactions?</ToastTitle>
            <ToastDescription>
              Change category to {categoryName}
            </ToastDescription>
          </div>
        </div>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              onAddRule()
              onOpenChange(false)
            }}
          >
            Add rule
          </Button>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport className="p-6" />
    </ToastProvider>
  )
}
