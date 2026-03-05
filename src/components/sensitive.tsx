"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/stores/app-store"

export function Sensitive({ children }: { children: React.ReactNode }) {
  const privacyMode = useAppStore((s) => s.privacyMode)
  const [revealed, setRevealed] = useState(false)

  if (!privacyMode) return <>{children}</>

  if (revealed) {
    return (
      <span
        className="inline-flex cursor-default"
        onMouseLeave={() => setRevealed(false)}
      >
        {children}
      </span>
    )
  }

  return (
    <span
      className="inline-flex cursor-default select-none"
      onMouseEnter={() => setRevealed(true)}
      aria-hidden
    >
      ••••
    </span>
  )
}
