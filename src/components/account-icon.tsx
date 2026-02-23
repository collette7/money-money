"use client"

import { cn } from "@/lib/utils"
import { CreditCard, Wallet, DollarSign, Landmark } from "lucide-react"
import { extractAccountLastFour, getBankLogoUrls } from "@/lib/account-utils"
import { useState } from "react"

interface AccountIconProps {
  accountNumber?: string | null
  accountType?: string | null
  institutionName?: string | null
  institutionDomain?: string | null
  className?: string
  showNumber?: boolean
  size?: "sm" | "md" | "lg"
  useBankLogo?: boolean
}

const accountTypeIcons = {
  checking: Wallet,
  savings: Landmark,
  credit: CreditCard,
  default: DollarSign,
}

const accountTypeColors = {
  checking: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  savings: "bg-green-500/10 text-green-600 border-green-500/20", 
  credit: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  default: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

export function AccountIcon({ 
  accountNumber, 
  accountType = "default",
  institutionName,
  institutionDomain,
  className,
  showNumber = true,
  size = "md",
  useBankLogo = true
}: AccountIconProps) {
  const logoUrls = institutionName ? getBankLogoUrls(institutionName, institutionDomain) : []
  const [logoUrlIndex, setLogoUrlIndex] = useState(0)
  const allLogosFailed = logoUrlIndex >= logoUrls.length

  const lastFour = accountNumber ? extractAccountLastFour(accountNumber) || accountNumber.slice(-4) : "****"
  const Icon = accountTypeIcons[accountType as keyof typeof accountTypeIcons] || accountTypeIcons.default
  const colorClass = accountTypeColors[accountType as keyof typeof accountTypeColors] || accountTypeColors.default
  
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  }
  
  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }
  
  const imageSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  }

  const renderIcon = () => {
    if (useBankLogo && institutionName && !allLogosFailed) {
      return (
        <div className="relative overflow-hidden rounded-full bg-white border border-gray-200 h-[16px] w-[16px]">
          <img 
            src={logoUrls[logoUrlIndex]}
            alt={institutionName}
            className="h-full w-full object-cover"
            onError={() => setLogoUrlIndex(i => i + 1)}
          />
        </div>
      )
    }
    
    return (
      <div className={cn(
        "rounded-full border flex items-center justify-center",
        colorClass,
        sizeClasses[size],
        className
      )}>
        <Icon className={iconSizes[size]} />
      </div>
    )
  }

  if (!showNumber) {
    return renderIcon()
  }

  return (
    <div className="flex items-center gap-2">
      {renderIcon()}
      <span className="font-medium text-sm">{lastFour}</span>
    </div>
  )
}