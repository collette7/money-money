"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface BudgetItem {
  category_id: string;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  limit_amount: number;
  spent_amount: number;
}

interface BudgetData {
  totalBudget: number;
  totalSpent: number;
  items: BudgetItem[];
}

export function BudgetView({ month, year }: { month: number; year: number }) {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBudget() {
      try {
        const response = await fetch(`/api/budgets?month=${month}&year=${year}`);
        if (response.ok) {
          const data = await response.json();
          setBudgetData(data);
        }
      } catch (error) {
        console.error("Failed to fetch budget:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBudget();
  }, [month, year]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-2 w-32" />
            <div className="h-2 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!budgetData || budgetData.items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No budget set for this month</p>
        <Button asChild>
          <Link href="/spending/breakdown">
            Create Budget
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const percentageUsed = budgetData.totalBudget > 0 
    ? (budgetData.totalSpent / budgetData.totalBudget) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Overall Budget</span>
          <span className="text-sm text-muted-foreground">
            ${budgetData.totalSpent.toLocaleString()} / ${budgetData.totalBudget.toLocaleString()}
          </span>
        </div>
        <Progress value={percentageUsed} className="h-3" />
        <p className="text-xs text-muted-foreground">
          {percentageUsed.toFixed(1)}% of budget used
        </p>
      </div>

      <div className="space-y-4">
        {budgetData.items.map((item) => {
          const percentage = item.limit_amount > 0 
            ? (item.spent_amount / item.limit_amount) * 100 
            : 0;
          const isOverBudget = percentage > 100;

          return (
            <div key={item.category_id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {item.category_icon && (
                    <span className="text-lg">{item.category_icon}</span>
                  )}
                  <span className="font-medium text-sm">{item.category_name}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : ''}`}>
                    ${item.spent_amount.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground"> / ${item.limit_amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className="h-2"
                />
                {isOverBudget && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <span className="text-xs text-red-600 font-medium">
                      +{(percentage - 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t">
        <Button asChild variant="outline" className="w-full">
          <Link href="/spending/breakdown">
            Manage Budget
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}