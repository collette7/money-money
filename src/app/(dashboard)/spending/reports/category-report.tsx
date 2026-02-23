"use client";

import { generateCategoryReport } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useState, useTransition, useEffect } from "react"

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8C471", "#82E0AA"
];

export function CategoryReportView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      const result = await generateCategoryReport(6);
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleMonthsChange = (value: string) => {
    setMonths(value);
    setSelectedMonth("all");
    startTransition(async () => {
      const newData = await generateCategoryReport(parseInt(value));
      setData(newData);
    });
  };

  const getCategoryTotals = () => {
    const totals = new Map<string, number>();
    
    if (selectedMonth === "all") {
      data.forEach(month => {
        month.categories.forEach((cat: any) => {
          totals.set(cat.name, (totals.get(cat.name) || 0) + cat.amount);
        });
      });
    } else {
      const monthData = data.find(m => m.month === selectedMonth);
      monthData?.categories.forEach((cat: any) => {
        totals.set(cat.name, cat.amount);
      });
    }

    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, value: amount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const pieData = getCategoryTotals();
  const totalSpending = pieData.reduce((sum, item) => sum + item.value, 0);

  const monthOptions = [
    { value: "all", label: "All Months" },
    ...data.map(m => ({
      value: m.month,
      label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }))
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Category Analysis</h3>
          <p className="text-sm text-muted-foreground">Spending breakdown by category</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isPending}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={months} onValueChange={handleMonthsChange} disabled={isPending}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
            <CardDescription>
              {selectedMonth === "all" ? "Total spending across all months" : "Monthly spending breakdown"}
            </CardDescription>
          </CardHeader>
          <CardContent className={isPending ? "opacity-50" : ""}>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Highest spending categories</CardDescription>
          </CardHeader>
          <CardContent className={isPending ? "opacity-50" : ""}>
            <div className="space-y-4">
              {pieData.map((item, index) => {
                const percentage = (item.value / totalSpending) * 100;
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="tabular-nums">
                        ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length] 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}