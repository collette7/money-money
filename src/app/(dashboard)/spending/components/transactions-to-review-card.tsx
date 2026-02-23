"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionDetailSheet } from "@/components/transaction-detail-sheet";

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "TODAY";
  if (diff === 1) return "YESTERDAY";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  })
    .format(d)
    .toUpperCase();
}

type Transaction = {
  id: string;
  description: string | null;
  merchant_name: string | null;
  amount: number;
  date: string;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
};

type TransactionsToReviewCardProps = {
  transactions: Transaction[];
  categories: Category[];
};

export function TransactionsToReviewCard({
  transactions,
  categories,
}: TransactionsToReviewCardProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const grouped = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = grouped.get(tx.date) ?? [];
    existing.push(tx);
    grouped.set(tx.date, existing);
  }

  return (
    <Card className="rounded-[14px]">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Transactions To Review
        </CardTitle>
        <Link
          href="/transactions?view=review"
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          View All
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-3">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No uncategorized transactions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([date, txs]) => (
              <div key={date}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 mt-1">
                  {relativeDate(date)}
                </p>
                <div className="space-y-1">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors rounded-md px-2 -mx-2"
                      onClick={() => {
                        setSelectedTx(tx);
                        setSheetOpen(true);
                      }}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="text-sm">•</span>
                        <p className="text-sm font-medium truncate">
                          {tx.merchant_name ?? tx.description ?? "Transaction"}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Uncategorized
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          tx.amount >= 0 ? "text-emerald-600" : "text-foreground"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {currency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              {transactions.length} of {transactions.length}
            </span>
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              <CheckCircle2 className="size-3.5" />
              Mark {transactions.length} as reviewed
            </button>
          </div>
        )}
      </CardContent>

      <TransactionDetailSheet
        transaction={selectedTx ? {
          id: selectedTx.id,
          description: selectedTx.description || "",
          merchant_name: selectedTx.merchant_name,
          amount: selectedTx.amount,
          date: selectedTx.date,
          categories: null,
        } : null}
        categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </Card>
  );
}
