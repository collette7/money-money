"use client"

import { useState, useEffect } from "react"
import { getForecast } from "./actions"
import { ForecastResult, ForecastScenario, ForecastHorizon } from "@/lib/forecast/engine"

export const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)

export function useForecast() {
  const [scenario, setScenario] = useState<ForecastScenario>("realistic")
  const [horizon, setHorizon] = useState<ForecastHorizon>(6)
  const [forecastData, setForecastData] = useState<ForecastResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getForecast(scenario, horizon)
      .then(setForecastData)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [scenario, horizon])

  const lastPoint = forecastData ? forecastData.points[forecastData.points.length - 1] : null
  const firstPoint = forecastData ? forecastData.points[0] : null
  const netWorthChange = lastPoint && firstPoint ? lastPoint.netWorth - firstPoint.netWorth : 0
  const rawPctChange = lastPoint && firstPoint && Math.abs(firstPoint.netWorth) >= 100
    ? (netWorthChange / Math.abs(firstPoint.netWorth)) * 100
    : 0
  const percentChange = Math.max(-999, Math.min(999, rawPctChange))

  const scenarioDescriptions = {
    conservative: "Assumes 5% lower income and 10% higher expenses, with slight market decline",
    realistic: "Based on your current spending patterns and income trends",
    optimistic: "Assumes 5% higher income and 5% lower expenses, with market growth"
  }

  return {
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
  }
}
