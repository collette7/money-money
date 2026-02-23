import type { RecurringFrequency } from "@/types/database";

export interface RecurringRuleMatch {
  ruleId: string;
  merchantPattern: string;
  categoryId: string | null;
  expectedAmount: number | null;
  frequency: RecurringFrequency;
  expectedDay: number | null;
}

export interface TransactionCandidate {
  id: string;
  merchantName: string | null;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  recurringId: string | null;
}

export function matchTransactionToRule(
  tx: TransactionCandidate,
  rules: RecurringRuleMatch[]
): RecurringRuleMatch | null {
  if (tx.recurringId) return null;

  const txMerchant = (tx.merchantName ?? tx.description).toLowerCase().trim();
  if (!txMerchant) return null;

  for (const rule of rules) {
    const pattern = rule.merchantPattern.toLowerCase().trim();

    if (txMerchant.includes(pattern) || pattern.includes(txMerchant)) {
      if (rule.expectedAmount !== null) {
        const amountDiff = Math.abs(Math.abs(tx.amount) - Math.abs(rule.expectedAmount));
        const tolerance = Math.abs(rule.expectedAmount) * 0.15;
        if (amountDiff > tolerance && amountDiff > 5) continue;
      }

      return rule;
    }
  }

  return null;
}

export function computeNextExpected(
  lastDate: string,
  frequency: RecurringFrequency,
  expectedDay?: number | null
): string {
  const d = new Date(lastDate);

  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      if (expectedDay) d.setDate(Math.min(expectedDay, daysInMonth(d)));
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      if (expectedDay) d.setDate(Math.min(expectedDay, daysInMonth(d)));
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split("T")[0];
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function detectRecurringPattern(
  transactions: { merchantName: string; amount: number; date: string }[]
): { frequency: RecurringFrequency; expectedDay: number; avgAmount: number } | null {
  if (transactions.length < 2) return null;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date).getTime();
    const curr = new Date(sorted[i].date).getTime();
    gaps.push(Math.round((curr - prev) / (1000 * 60 * 60 * 24)));
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  let frequency: RecurringFrequency;
  if (avgGap <= 10) frequency = "weekly";
  else if (avgGap <= 18) frequency = "biweekly";
  else if (avgGap <= 45) frequency = "monthly";
  else if (avgGap <= 100) frequency = "quarterly";
  else if (avgGap <= 400) frequency = "annual";
  else return null;

  const days = sorted.map((t) => new Date(t.date).getDate());
  const dayFreq = new Map<number, number>();
  for (const day of days) dayFreq.set(day, (dayFreq.get(day) ?? 0) + 1);
  let expectedDay = days[0];
  let maxFreq = 0;
  for (const [day, freq] of dayFreq) {
    if (freq > maxFreq) {
      maxFreq = freq;
      expectedDay = day;
    }
  }

  const avgAmount =
    transactions.reduce((s, t) => s + Math.abs(t.amount), 0) / transactions.length;

  return { frequency, expectedDay, avgAmount };
}
