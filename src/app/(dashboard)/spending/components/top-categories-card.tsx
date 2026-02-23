"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

type HierarchicalCategory = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
  budget: number;
  children: HierarchicalCategory[];
};

function CategoryRow({ cat, depth = 0 }: { cat: HierarchicalCategory; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = cat.children.length > 0;
  const pct = cat.budget > 0 ? Math.min((cat.total / cat.budget) * 100, 100) : 0;
  const barColor = cat.budget > 0 && pct > 90
    ? "oklch(0.65 0.22 15)"
    : cat.budget > 0 && pct > 75
      ? "oklch(0.75 0.17 70)"
      : cat.color ?? "oklch(0.55 0.15 250)";

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between text-sm py-1.5",
          hasChildren && "cursor-pointer",
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground shrink-0 transition-transform duration-150",
                expanded && "rotate-90"
              )}
            />
          ) : (
            <span
              className="size-2 rounded-full shrink-0 ml-0.5 mr-0.5"
              style={{ backgroundColor: cat.color ?? "#94a3b8" }}
            />
          )}
          <span className={cn("truncate", depth > 0 ? "text-muted-foreground" : "font-medium")}>
            {cat.name}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
          {compactCurrency(cat.total)}
          {cat.budget > 0 && (
            <span className="text-muted-foreground/60"> / {compactCurrency(cat.budget)}</span>
          )}
        </span>
      </div>
      {cat.budget > 0 && (
        <div
          className="h-1 rounded-full bg-primary/10 overflow-hidden mb-1"
          style={{ marginLeft: depth > 0 ? `${depth * 16}px` : undefined }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      {expanded && cat.children.map((child) => (
        <CategoryRow key={child.id} cat={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function TopCategoriesCard({ categories }: { categories: HierarchicalCategory[] }) {
  return (
    <Card className="rounded-[14px]">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top Categories
        </CardTitle>
        <Link
          href="/spending/breakdown"
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          View All
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No spending this month.
          </p>
        ) : (
          <div>
            {categories.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
