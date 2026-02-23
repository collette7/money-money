"use client"

import { useEffect, useRef } from "react"
import { autoSyncIfNeeded } from "@/app/(dashboard)/accounts/actions"

export function AutoSync() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    autoSyncIfNeeded().catch(() => {})
  }, [])

  return null
}
