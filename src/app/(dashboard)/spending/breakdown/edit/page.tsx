import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHierarchicalBudget } from "@/app/(dashboard)/budgets/actions";
import { CategoriesEditorPage } from "./editor-page";

export default async function EditCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const allCategories = await getHierarchicalBudget(month, year);

  return (
    <CategoriesEditorPage
      categories={allCategories}
      month={month}
      year={year}
    />
  );
}
