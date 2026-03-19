"use client"

import { Sensitive } from "@/components/sensitive"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

type SpendingTrendsChartProps = {
  data: {
    month: string
    totalExpenses: number
    totalIncome: number
  }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

export function SpendingTrendsChart({ data }: SpendingTrendsChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: 'var(--color-muted-foreground)' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium">{payload[0].payload.month}</p>
                    <div className="space-y-1 mt-1">
                      <p className="text-sm text-expense">
                        Expenses: <Sensitive>{formatCurrency(payload[0].value as number)}</Sensitive>
                      </p>
                      {payload[1] && (
                        <p className="text-sm text-income">
                          Income: <Sensitive>{formatCurrency(payload[1].value as number)}</Sensitive>
                        </p>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Line 
            type="monotone" 
            dataKey="totalExpenses" 
            stroke="var(--color-expense)" 
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="totalIncome" 
            stroke="var(--color-income)" 
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}