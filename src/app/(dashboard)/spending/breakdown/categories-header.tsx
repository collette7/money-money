"use client";

import { Pencil } from "lucide-react";
import { AIRebalanceButton } from "./ai-rebalance-button";

interface CategoriesHeaderProps {
  month: number;
  year: number;
  onEdit?: () => void;
}

export function CategoriesHeader({ month, year, onEdit }: CategoriesHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <AIRebalanceButton month={month} year={year} />
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-[#4f39f6] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Pencil className="size-4" />
        Edit
      </button>
    </div>
  );
}
