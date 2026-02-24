"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { getMerchantLogoUrls } from "@/lib/merchant-utils"
import { Store } from "lucide-react"

interface MerchantLogoProps {
  merchantName: string | null | undefined
  cachedDomain?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

export function MerchantLogo({
  merchantName,
  cachedDomain,
  size = "sm",
  className,
}: MerchantLogoProps) {
  const logoUrls = merchantName ? getMerchantLogoUrls(merchantName, cachedDomain) : []
  const [urlIndex, setUrlIndex] = useState(0)
  const allFailed = urlIndex >= logoUrls.length

  const initial = merchantName
    ? merchantName.replace(/[^a-zA-Z0-9]/, "").charAt(0).toUpperCase()
    : null

  const sizeClass = size === "lg" ? "size-9" : size === "md" ? "size-6" : "size-5"

  if (logoUrls.length > 0 && !allFailed) {
    return (
      <div
        className={cn(
          "relative shrink-0 rounded-full overflow-hidden bg-white dark:bg-gray-900 border border-border/60",
          sizeClass,
          className
        )}
      >
        <img
          src={logoUrls[urlIndex]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setUrlIndex((i) => i + 1)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-muted flex items-center justify-center",
        sizeClass,
        className
      )}
    >
      {initial ? (
        <span
          className={cn(
            "font-semibold leading-none text-muted-foreground",
            size === "sm" && "text-[8px]",
            size === "md" && "text-[9px]",
            size === "lg" && "text-[11px]",
          )}
        >
          {initial}
        </span>
      ) : (
        <Store
          className={cn(
            "text-muted-foreground",
            size === "sm" && "size-2",
            size === "md" && "size-3",
            size === "lg" && "size-4",
          )}
        />
      )}
    </div>
  )
}
