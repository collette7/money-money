"use client"

import { cn } from "@/lib/utils"

type Segment = {
  value: number
  color: string
}

type SegmentedBarProps = {
  segments: Segment[]
  height?: number
  className?: string
}

export function SegmentedBar({ segments, height = 24, className }: SegmentedBarProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  
  return (
    <div 
      className={cn("segmented-bar", className)}
      style={{ height }}
    >
      {segments.map((segment, index) => {
        const percentage = (segment.value / total) * 100
        const isFirst = index === 0
        const isLast = index === segments.length - 1
        
        return (
          <div
            key={index}
            className="segmented-bar__segment"
            style={{
              width: `${percentage}%`,
              backgroundColor: segment.color,
              borderRadius: isFirst ? '12px 0 0 12px' : isLast ? '0 12px 12px 0' : '0',
            }}
          />
        )
      })}
    </div>
  )
}