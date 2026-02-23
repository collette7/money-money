import { addMonths, differenceInMonths } from "date-fns";

export interface NetWorthSnapshot {
  date: string;
  net_worth: number;
  total_assets: number | null;
  total_liabilities: number | null;
}

export interface TimeSeriesForecastResult {
  method: "timeseries" | "behavioral";
  points: TimeSeriesForecastPoint[];
  metrics: {
    geometricMeanGrowth: number;
    averageSavings: number;
    marketReturn: number;
    savingsTrend: number;
    volatility: number;
    r2: number;
  };
}

export interface TimeSeriesForecastPoint {
  date: string;
  netWorth: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
}

export class TimeSeriesForecastEngine {
  private snapshots: NetWorthSnapshot[];
  
  constructor(snapshots: NetWorthSnapshot[]) {
    this.snapshots = snapshots.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  calculateForecast(horizon: number): TimeSeriesForecastResult {
    if (this.snapshots.length < 3) {
      return this.fallbackForecast(horizon);
    }

    const growthSeries = this.calculateGrowthSeries();
    const geometricMeanGrowth = this.calculateGeometricMeanGrowth(growthSeries);
    const decomposition = this.decomposeGrowth();
    const savingsTrend = this.detectSavingsTrend(decomposition.savings);
    const volatility = this.calculateVolatility(growthSeries);
    
    const forecastPoints = this.generateTimeSeriesForecast(
      horizon,
      geometricMeanGrowth,
      decomposition,
      savingsTrend,
      volatility
    );

    return {
      method: "timeseries",
      points: forecastPoints,
      metrics: {
        geometricMeanGrowth,
        averageSavings: decomposition.averageSavings,
        marketReturn: decomposition.marketReturn,
        savingsTrend,
        volatility,
        r2: decomposition.r2,
      },
    };
  }

  private calculateGrowthSeries(): number[] {
    const growthRates: number[] = [];
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const current = this.snapshots[i].net_worth;
      const previous = this.snapshots[i - 1].net_worth;
      
      if (previous !== 0) {
        const growth = (current - previous) / Math.abs(previous);
        growthRates.push(growth);
      }
    }
    
    return growthRates;
  }

  private calculateGeometricMeanGrowth(growthRates: number[]): number {
    if (growthRates.length === 0) return 0;
    
    const product = growthRates.reduce((acc, rate) => acc * (1 + rate), 1);
    return Math.pow(product, 1 / growthRates.length) - 1;
  }

  private decomposeGrowth(): {
    averageSavings: number;
    marketReturn: number;
    r2: number;
    savings: number[];
  } {
    if (this.snapshots.length < 2) {
      return { averageSavings: 0, marketReturn: 0, r2: 0, savings: [] };
    }

    const changes: number[] = [];
    const previousValues: number[] = [];
    const savings: number[] = [];
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const change = this.snapshots[i].net_worth - this.snapshots[i - 1].net_worth;
      const previous = this.snapshots[i - 1].net_worth;
      
      changes.push(change);
      previousValues.push(previous);
      
      const monthsBetween = differenceInMonths(
        new Date(this.snapshots[i].date),
        new Date(this.snapshots[i - 1].date)
      ) || 1;
      
      savings.push(change / monthsBetween);
    }
    
    const regression = this.linearRegression(previousValues, changes);
    
    const averageSavings = regression.intercept;
    const marketReturn = regression.slope;
    
    return {
      averageSavings,
      marketReturn,
      r2: regression.r2,
      savings,
    };
  }

  private linearRegression(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    const totalSS = y.reduce((total, yi) => total + Math.pow(yi - yMean, 2), 0);
    const residualSS = y.reduce((total, yi, i) => {
      const predicted = intercept + slope * x[i];
      return total + Math.pow(yi - predicted, 2);
    }, 0);
    
    const r2 = totalSS === 0 ? 0 : 1 - residualSS / totalSS;
    
    return { slope, intercept, r2 };
  }

  private detectSavingsTrend(savings: number[]): number {
    if (savings.length < 2) return 0;
    
    const x = Array.from({ length: savings.length }, (_, i) => i);
    const regression = this.linearRegression(x, savings);
    
    return regression.slope;
  }

  private calculateVolatility(growthRates: number[]): number {
    if (growthRates.length < 2) return 0;
    
    const mean = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => 
      sum + Math.pow(rate - mean, 2), 0
    ) / growthRates.length;
    
    return Math.sqrt(variance);
  }

  private generateTimeSeriesForecast(
    horizon: number,
    _personalGrowthRate: number,
    decomposition: ReturnType<typeof this.decomposeGrowth>,
    savingsTrend: number,
    volatility: number
  ): TimeSeriesForecastPoint[] {
    const points: TimeSeriesForecastPoint[] = [];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    let currentNetWorth = lastSnapshot.net_worth;
    const startDate = new Date(lastSnapshot.date);
    
    for (let month = 1; month <= horizon; month++) {
      const forecastDate = addMonths(startDate, month);
      
      const trendAdjustedSavings = decomposition.averageSavings + savingsTrend * month;
      
      const expectedGrowth = currentNetWorth * decomposition.marketReturn;
      const monthlyChange = trendAdjustedSavings + expectedGrowth;
      
      currentNetWorth += monthlyChange;
      
      const stdError = volatility * currentNetWorth * Math.sqrt(month);
      const confidenceMultiplier = 1.96;
      
      const upperBound = currentNetWorth + confidenceMultiplier * stdError;
      const lowerBound = currentNetWorth - confidenceMultiplier * stdError;
      
      const confidence = Math.max(0.5, 0.95 - 0.05 * Math.sqrt(month));
      
      points.push({
        date: forecastDate.toISOString().split('T')[0],
        netWorth: Math.round(currentNetWorth),
        upperBound: Math.round(upperBound),
        lowerBound: Math.round(lowerBound),
        confidence,
      });
    }
    
    return points;
  }

  private fallbackForecast(horizon: number): TimeSeriesForecastResult {
    const lastSnapshot = this.snapshots[this.snapshots.length - 1] || {
      net_worth: 0,
      date: new Date().toISOString().split('T')[0],
    };
    
    const points: TimeSeriesForecastPoint[] = [];
    const startDate = new Date(lastSnapshot.date);
    
    for (let month = 1; month <= horizon; month++) {
      const forecastDate = addMonths(startDate, month);
      points.push({
        date: forecastDate.toISOString().split('T')[0],
        netWorth: lastSnapshot.net_worth,
        upperBound: lastSnapshot.net_worth * 1.1,
        lowerBound: lastSnapshot.net_worth * 0.9,
        confidence: 0.5,
      });
    }
    
    return {
      method: "behavioral",
      points,
      metrics: {
        geometricMeanGrowth: 0,
        averageSavings: 0,
        marketReturn: 0,
        savingsTrend: 0,
        volatility: 0,
        r2: 0,
      },
    };
  }
}