"use client"

import Link from "next/link"
import { useForecast, compactCurrency, formatPercent } from "./use-forecast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { ForecastScenario, ForecastHorizon } from "@/lib/forecast/engine"

export default function ForecastPage() {
  const {
    scenario,
    setScenario,
    horizon,
    setHorizon,
    forecastData,
    isLoading,
    lastPoint,
    firstPoint,
    netWorthChange,
    percentChange,
    scenarioDescriptions,
  } = useForecast()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!forecastData || !lastPoint) {
    return (
      <EmptyState
        icon={<TrendingUp className="size-6" />}
        title="No forecast data available"
        description="Add accounts and transactions to generate financial projections."
        actions={[
          {
            label: "Connect Account",
            asChild: true,
            children: <Link href="/accounts">Connect Account</Link>,
          },
        ]}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Financial Forecast</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Projections based on your transaction history and spending patterns
          </p>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <Select
            value={scenario}
            onValueChange={(value) => setScenario(value as ForecastScenario)}
          >
            <SelectTrigger className="w-[130px] sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="optimistic">Optimistic</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={horizon.toString()}
            onValueChange={(value) => setHorizon(parseInt(value) as ForecastHorizon)}
          >
            <SelectTrigger className="w-[110px] sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Month</SelectItem>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected Net Worth</CardTitle>
            <CardDescription className="text-xs">
              In {horizon} month{horizon > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {compactCurrency(lastPoint.netWorth)}
            </p>
            <p className="text-sm mt-1">
              <span className={netWorthChange >= 0 ? "text-emerald-600" : "text-rose-500"}>
                {netWorthChange >= 0 ? "+" : ""}
                {compactCurrency(netWorthChange)} ({formatPercent(percentChange)})
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
            <CardDescription className="text-xs">Average projection</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {compactCurrency(
                forecastData.assumptions.avgMonthlyIncome - 
                forecastData.assumptions.avgMonthlyExpenses
              )}
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Income: {compactCurrency(forecastData.assumptions.avgMonthlyIncome)}</p>
              <p>Expenses: {compactCurrency(forecastData.assumptions.avgMonthlyExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Rate</CardTitle>
            <CardDescription className="text-xs">
              {scenario.charAt(0).toUpperCase() + scenario.slice(1)} scenario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatPercent(forecastData.assumptions.growthRate * 100)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {scenarioDescriptions[scenario]}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net Worth Projection</CardTitle>
          <CardDescription>
            {horizon}-month forecast with confidence intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[280px] sm:h-[400px] w-full p-3 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={forecastData.points}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })
                  }
                  stroke="#737373"
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  stroke="#737373"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (typeof value !== "number" || name === "confidenceUpper" || name === "confidenceLower") {
                      return null
                    }
                    return [compactCurrency(value), "Net Worth"]
                  }}
                  labelFormatter={(date) =>
                    date ? new Date(date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }) : ""
                  }
                />
                <Area
                  type="monotone"
                  dataKey="confidenceUpper"
                  stroke="none"
                  fill="url(#confidenceGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="confidenceLower"
                  stroke="none"
                  fill="#fff"
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#netWorthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Key Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Monthly Income</span>
              <span className="text-sm font-medium tabular-nums">
                {compactCurrency(forecastData.assumptions.avgMonthlyIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Monthly Expenses</span>
              <span className="text-sm font-medium tabular-nums">
                {compactCurrency(forecastData.assumptions.avgMonthlyExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recurring Income</span>
              <span className="text-sm font-medium tabular-nums">
                {compactCurrency(forecastData.assumptions.recurringIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recurring Expenses</span>
              <span className="text-sm font-medium tabular-nums">
                {compactCurrency(forecastData.assumptions.recurringExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {forecastData.points
              .filter((_, i) => i % Math.ceil(forecastData.points.length / 4) === 0)
              .map((point) => (
                <div key={point.date} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {new Date(point.date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-medium">
                    {formatPercent(point.confidence * 100)} confidence
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}