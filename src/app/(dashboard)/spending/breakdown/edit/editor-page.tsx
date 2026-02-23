"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryWithHierarchy } from "../expandable-categories";
import { CategoriesEditor } from "../categories-editor";

interface CategoriesEditorPageProps {
  categories: CategoryWithHierarchy[];
  month: number;
  year: number;
}

export function CategoriesEditorPage({
  categories,
  month,
  year,
}: CategoriesEditorPageProps) {
  const router = useRouter();

  function handleCancel() {
    router.push(`/spending/breakdown?month=${month}&year=${year}`);
  }

  function handleSaved() {
    router.push(`/spending/breakdown?month=${month}&year=${year}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/60">
        <CardContent className="pt-6">
          <CategoriesEditor
            categories={categories}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        </CardContent>
      </Card>
    </div>
  );
}
