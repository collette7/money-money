import type { BudgetPeriod } from "@/types/database";

export function getMonthDateRange(month: number, year: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { startDate, endDate };
}

export function getPeriodDateRange(
  month: number,
  year: number,
  period: BudgetPeriod = "monthly"
): { startDate: string; endDate: string } {
  if (period === "annual") {
    return { startDate: `${year}-01-01`, endDate: `${year + 1}-01-01` };
  }

  if (period === "weekly") {
    const d = new Date(year, month - 1, 1);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(monday), endDate: fmt(sunday) };
  }

  return getMonthDateRange(month, year);
}
