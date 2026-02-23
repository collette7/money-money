"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthSelector } from "../../budgets/month-selector";
import type { CategoryWithHierarchy } from "./expandable-categories";
import { ExpensesTab } from "./expenses-tab";
import { BudgetTab } from "./budget-tab";
import { IncomeTab } from "./income-tab";

interface CategoriesSectionProps {
  expenseCategories: CategoryWithHierarchy[];
  incomeCategories: CategoryWithHierarchy[];
  month: number;
  year: number;
}

export function CategoriesSection({
  expenseCategories,
  incomeCategories,
  month,
  year,
}: CategoriesSectionProps) {
  return (
    <Card className="border-slate-200/60">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Category Breakdown
          </h2>
          <div className="flex items-center gap-2">
            <MonthSelector month={month} year={year} />
            <Link
              href={`/spending/breakdown/edit?month=${month}&year=${year}`}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Pencil className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        <Tabs defaultValue="expenses">
          <TabsList variant="line" className="w-full justify-start gap-6 border-b border-slate-200 dark:border-slate-700">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-4">
            <ExpensesTab categories={expenseCategories} />
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            <BudgetTab categories={expenseCategories} month={month} year={year} />
          </TabsContent>

          <TabsContent value="income" className="mt-4">
            <IncomeTab categories={incomeCategories} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
