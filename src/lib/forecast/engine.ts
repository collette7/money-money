import { addMonths } from "date-fns";

export type ForecastScenario = "conservative" | "realistic" | "optimistic";
export type ForecastHorizon = 1 | 3 | 6 | 12;

export interface Transaction {
  date: string;
  amount: number;
  category_id: string | null;
  is_recurring: boolean | null;
  is_income?: boolean;
}

export interface RecurringTransaction {
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  next_date: string | null;
}

export interface ForecastPoint {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  confidence: number;
  confidenceUpper: number;
  confidenceLower: number;
}

export interface ForecastResult {
  scenario: ForecastScenario;
  horizon: ForecastHorizon;
  points: ForecastPoint[];
  assumptions: {
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    recurringIncome: number;
    recurringExpenses: number;
    growthRate: number;
  };
}

export class ForecastEngine {
  private transactions: Transaction[];
  private recurringTransactions: RecurringTransaction[];
  private currentNetWorth: number;
  private currentAssets: number;
  private currentLiabilities: number;

  constructor(
    transactions: Transaction[],
    recurringTransactions: RecurringTransaction[],
    currentNetWorth: number,
    currentAssets: number,
    currentLiabilities: number
  ) {
    this.transactions = transactions;
    this.recurringTransactions = recurringTransactions;
    this.currentNetWorth = currentNetWorth;
    this.currentAssets = currentAssets;
    this.currentLiabilities = currentLiabilities;
  }

  calculateForecast(
    scenario: ForecastScenario,
    horizon: ForecastHorizon
  ): ForecastResult {
    const historicalStats = this.analyzeHistoricalData();
    const scenarioMultiplier = this.getScenarioMultiplier(scenario);
    const points = this.generateForecastPoints(
      historicalStats,
      scenarioMultiplier,
      horizon
    );

    return {
      scenario,
      horizon,
      points,
      assumptions: {
        avgMonthlyIncome: historicalStats.avgMonthlyIncome,
        avgMonthlyExpenses: historicalStats.avgMonthlyExpenses * scenarioMultiplier.expenses,
        recurringIncome: historicalStats.recurringIncome,
        recurringExpenses: historicalStats.recurringExpenses,
        growthRate: scenarioMultiplier.growth,
      },
    };
  }

  private analyzeHistoricalData() {
    const now = new Date();
    const threeMonthsAgo = addMonths(now, -3);
    
    const recentTransactions = this.transactions.filter(
      tx => new Date(tx.date) >= threeMonthsAgo
    );

    const incomeTransactions = recentTransactions.filter(tx => tx.amount > 0 && tx.is_income === true);
    const expenseTransactions = recentTransactions.filter(tx => tx.amount < 0);

    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = Math.abs(expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0));

    const monthlyRecurringIncome = this.recurringTransactions
      .filter(rt => rt.amount > 0)
      .reduce((sum, rt) => {
        const monthlyAmount = this.convertToMonthly(rt.amount, rt.frequency);
        return sum + monthlyAmount;
      }, 0);

    const monthlyRecurringExpenses = this.recurringTransactions
      .filter(rt => rt.amount < 0)
      .reduce((sum, rt) => {
        const monthlyAmount = Math.abs(this.convertToMonthly(rt.amount, rt.frequency));
        return sum + monthlyAmount;
      }, 0);

    const dates = recentTransactions.map(tx => new Date(tx.date));
    const earliestDate = dates.length > 0 ? Math.min(...dates.map(d => d.getTime())) : threeMonthsAgo.getTime();
    const daySpan = (now.getTime() - earliestDate) / (1000 * 60 * 60 * 24);
    const monthsInPeriod = Math.max(1, daySpan / 30.44);

    const avgMonthlyIncome = totalIncome / monthsInPeriod;
    const avgMonthlyExpenses = totalExpenses / monthsInPeriod;

    const categorySpending = this.analyzeCategorySpending(recentTransactions);
    const volatility = this.calculateVolatility(recentTransactions);

    return {
      avgMonthlyIncome,
      avgMonthlyExpenses,
      recurringIncome: monthlyRecurringIncome,
      recurringExpenses: monthlyRecurringExpenses,
      categorySpending,
      volatility,
    };
  }

  private analyzeCategorySpending(transactions: Transaction[]) {
    const categoryTotals = new Map<string, number>();
    
    transactions
      .filter(tx => tx.category_id && tx.amount < 0)
      .forEach(tx => {
        const current = categoryTotals.get(tx.category_id!) || 0;
        categoryTotals.set(tx.category_id!, current + Math.abs(tx.amount));
      });

    return categoryTotals;
  }

  private calculateVolatility(transactions: Transaction[]) {
    const monthlyTotals = new Map<string, number>();
    
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7);
      const current = monthlyTotals.get(month) || 0;
      monthlyTotals.set(month, current + tx.amount);
    });

    const values = Array.from(monthlyTotals.values());
    if (values.length < 2) return 0;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private getScenarioMultiplier(scenario: ForecastScenario) {
    switch (scenario) {
      case "conservative":
        return { income: 0.95, expenses: 1.1, growth: -0.02 };
      case "realistic":
        return { income: 1.0, expenses: 1.0, growth: 0.01 };
      case "optimistic":
        return { income: 1.05, expenses: 0.95, growth: 0.03 };
    }
  }

  private convertToMonthly(amount: number, frequency: string): number {
    switch (frequency) {
      case "daily":
        return amount * 30;
      case "weekly":
        return amount * 4.33;
      case "monthly":
        return amount;
      case "yearly":
        return amount / 12;
      default:
        return amount;
    }
  }

  private generateForecastPoints(
    historicalStats: any,
    scenarioMultiplier: any,
    horizon: ForecastHorizon
  ): ForecastPoint[] {
    const points: ForecastPoint[] = [];
    const startDate = new Date();
    const monthsToForecast = horizon;

    let projectedNetWorth = this.currentNetWorth;
    let projectedAssets = this.currentAssets;
    let projectedLiabilities = this.currentLiabilities;

    points.push({
      date: startDate.toISOString().split('T')[0],
      netWorth: Math.round(projectedNetWorth),
      assets: Math.round(projectedAssets),
      liabilities: Math.round(projectedLiabilities),
      confidence: 1,
      confidenceUpper: Math.round(projectedNetWorth),
      confidenceLower: Math.round(projectedNetWorth),
    });

    for (let month = 1; month <= monthsToForecast; month++) {
      const forecastDate = addMonths(startDate, month);
      
      const monthlyIncome = historicalStats.avgMonthlyIncome * scenarioMultiplier.income;
      const monthlyExpenses = historicalStats.avgMonthlyExpenses * scenarioMultiplier.expenses;

      const netCashFlow = monthlyIncome - monthlyExpenses;
      const growthFactor = 1 + (scenarioMultiplier.growth / 12);

      projectedNetWorth = (projectedNetWorth + netCashFlow) * growthFactor;
      
      const avgLiabilityRatio = this.currentLiabilities / (this.currentAssets || 1);
      projectedAssets = projectedNetWorth / (1 - avgLiabilityRatio);
      projectedLiabilities = projectedAssets - projectedNetWorth;

      const confidence = this.calculateConfidence(month, historicalStats.volatility);
      const spreadFactor = (1 - confidence) * Math.abs(projectedNetWorth) * 0.5;
      const confidenceUpper = projectedNetWorth + spreadFactor;
      const confidenceLower = projectedNetWorth - spreadFactor;

      points.push({
        date: forecastDate.toISOString().split('T')[0],
        netWorth: Math.round(projectedNetWorth),
        assets: Math.round(projectedAssets),
        liabilities: Math.round(projectedLiabilities),
        confidence,
        confidenceUpper: Math.round(confidenceUpper),
        confidenceLower: Math.round(confidenceLower),
      });
    }

    return points;
  }

  private calculateConfidence(monthsAhead: number, volatility: number): number {
    const baseConfidence = 0.95;
    const decayRate = 0.05;
    const volatilityImpact = Math.min(volatility / 1000, 0.2);
    
    return Math.max(
      baseConfidence - (monthsAhead * decayRate) - volatilityImpact,
      0.5
    );
  }
}