"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"


type DonutSegment = {
  value: number
  color: string
  label: string
}

type DonutChartProps = {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  className?: string
}

export function DonutChart({ 
  segments, 
  size = 200, 
  strokeWidth = 40,
  className 
}: DonutChartProps) {
  const [mounted, setMounted] = useState(false)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  let cumulativeValue = 0
  
  return (
    <div className={cn("donut-chart", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle
            r={radius}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={strokeWidth}
            opacity="0.1"
          />
          
          {segments.map((segment, index) => {
            const percentage = segment.value / total
            const strokeDasharray = `${percentage * circumference} ${circumference}`
            const rotation = (cumulativeValue / total) * 360 - 90
            
            cumulativeValue += segment.value
            
            return (
              <circle
                key={index}
                className="donut-chart__segment"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={mounted ? 0 : circumference}
                transform={`rotate(${rotation})`}
                style={{
                  transition: `stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
                  strokeLinecap: 'round',
                }}
              />
            )
          })}
        </g>
        
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-chart__center-text"
        >
          <tspan 
            x="50%" 
            dy="-0.1em"
            fontSize={size * 0.15} 
            fontWeight="bold"
            fill="var(--color-foreground)"
            className={cn(mounted && "debt-animate-in")}
            style={{ animationDelay: "1s" }}
          >
            {segments.length}
          </tspan>
          <tspan 
            x="50%" 
            dy="1.2em"
            fontSize={size * 0.08}
            fill="var(--color-muted-foreground)"
            className={cn(mounted && "debt-animate-in")}
            style={{ animationDelay: "1.1s" }}
          >
            Debts
          </tspan>
        </text>
      </svg>
      
      <div className="donut-chart__legend">
        {segments.map((segment, index) => (
          <div 
            key={index} 
            className={cn(
              "donut-chart__legend-item",
              mounted && "debt-animate-slide-up debt-animate-stagger"
            )}
            style={{ 
              "--index": index,
              animationDelay: `${1.2 + index * 0.1}s`
            } as any}
          >
            <div 
              className="donut-chart__legend-color" 
              style={{ backgroundColor: segment.color }}
            />
            <span className="donut-chart__legend-label">{segment.label}</span>
            <span className="donut-chart__legend-value">
              {((segment.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}