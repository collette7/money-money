"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Sensitive } from "./sensitive"

type ContextualValueProps = {
  value: number
  format?: 'currency' | 'percent' | 'number'
  comparison?: {
    value: number
    label: string
    type?: 'previous' | 'average' | 'budget'
  }
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const formatValue = (value: number, format: ContextualValueProps['format'] = 'currency') => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat("en-US", { 
        style: "currency", 
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(value))
    case 'percent':
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
    case 'number':
      return value.toLocaleString()
    default:
      return value.toString()
  }
}

export function ContextualValue({
  value,
  format = 'currency',
  comparison,
  trend,
  label,
  size = 'md',
  className,
}: ContextualValueProps) {
  const sizeClasses = {
    sm: 'text-detail',
    md: 'text-body',
    lg: 'text-heading',
  }

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : 
                    trend?.direction === 'down' ? TrendingDown : 
                    Minus

  const percentChange = comparison 
    ? ((value - comparison.value) / comparison.value) * 100
    : 0

  const isPositiveChange = format === 'currency' 
    ? (value < 0 && percentChange < 0) || (value > 0 && percentChange > 0)
    : percentChange > 0

  return (
    <div className={cn("contextual-value", className)}>
      {label && (
        <span className="contextual-value__label text-label text-muted-foreground">
          {label}
        </span>
      )}
      
      <div className="contextual-value__primary">
        <span className={cn(
          "contextual-value__value font-bold",
          sizeClasses[size]
        )}>
          <Sensitive>{formatValue(value, format)}</Sensitive>
        </span>
        
        {trend && (
          <span className={cn(
            "contextual-value__trend inline-flex items-center gap-1 ml-2",
            "text-detail font-medium",
            trend.direction === 'up' && "text-expense",
            trend.direction === 'down' && "text-income",
            trend.direction === 'neutral' && "text-muted-foreground"
          )}>
            <TrendIcon className="w-3 h-3" />
            {formatValue(trend.value, format === 'currency' ? 'percent' : 'number')}
          </span>
        )}
      </div>
      
      {comparison && (
        <div className="contextual-value__comparison text-detail text-muted-foreground mt-1">
          <span className={cn(
            "font-medium",
            isPositiveChange ? "text-income" : "text-expense"
          )}>
            {formatValue(percentChange, 'percent')}
          </span>
          {' '}vs {comparison.label}
          {' '}
          <span className="text-foreground/60">
            (<Sensitive>{formatValue(comparison.value, format)}</Sensitive>)
          </span>
        </div>
      )}
    </div>
  )
}