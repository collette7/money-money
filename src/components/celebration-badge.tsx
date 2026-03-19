"use client"

import { cn } from "@/lib/utils"
import { Sparkles, TrendingDown, Target, Trophy, Star } from "lucide-react"

type CelebrationBadgeProps = {
  type: 'under-budget' | 'savings-goal' | 'spending-decrease' | 'streak' | 'milestone'
  message: string
  value?: string
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

const celebrationConfig = {
  'under-budget': {
    icon: TrendingDown,
    colorClass: 'bg-budget-safe/10 text-budget-safe border-budget-safe/20',
    iconClass: 'text-budget-safe',
  },
  'savings-goal': {
    icon: Target,
    colorClass: 'bg-primary/10 text-primary border-primary/20',
    iconClass: 'text-primary',
  },
  'spending-decrease': {
    icon: TrendingDown,
    colorClass: 'bg-income/10 text-income border-income/20',
    iconClass: 'text-income',
  },
  'streak': {
    icon: Star,
    colorClass: 'bg-budget-warning/10 text-budget-warning border-budget-warning/20',
    iconClass: 'text-budget-warning',
  },
  'milestone': {
    icon: Trophy,
    colorClass: 'bg-primary/10 text-primary border-primary/20',
    iconClass: 'text-primary',
  },
}

export function CelebrationBadge({
  type,
  message,
  value,
  size = 'md',
  animate = true,
  className,
}: CelebrationBadgeProps) {
  const config = celebrationConfig[type]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div
      className={cn(
        "celebration-badge inline-flex items-center rounded-full border font-medium transition-all",
        config.colorClass,
        sizeClasses[size],
        animate && "celebrate",
        className
      )}
    >
      <Icon className={cn(iconSizes[size], config.iconClass)} />
      <span>{message}</span>
      {value && (
        <>
          <span className="opacity-60">•</span>
          <span className="font-bold">{value}</span>
        </>
      )}
      {animate && (
        <Sparkles className={cn(iconSizes[size], "ml-auto", config.iconClass)} />
      )}
    </div>
  )
}