"use client";

import { useState, useTransition } from "react";
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  X,
  Save,
  Loader2,
  GripVertical,
} from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CategoryWithHierarchy } from "./expandable-categories";
import {
  updateCategories,
  deleteCategory,
} from "@/app/(dashboard)/budgets/actions";
import { createCategory } from "@/app/(dashboard)/transactions/actions";

interface EditableCategory extends CategoryWithHierarchy {
  isNew?: boolean;
  isDeleted?: boolean;
}

interface CategoriesEditorProps {
  categories: CategoryWithHierarchy[];
  onCancel: () => void;
  onSaved: () => void;
}

/* ─── Pending Add type ─── */

interface PendingAdd {
  tempId: string;
  name: string;
  emoji: string | null;
  color: string | null;
  parent_id: string | null;
  excluded_from_budget: boolean;
  categoryType: "income" | "expense" | "transfer";
}

/* ─── Emoji Button ─── */

function EmojiButton({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          style={{ width: 32, height: 32, fontSize: 18 }}
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-none shadow-xl"
        align="start"
        sideOffset={8}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => {
            onChange(emoji.native);
            setOpen(false);
          }}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
          maxFrequentRows={1}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ─── Sortable Category Row ─── */

interface CategoryRowProps {
  category: EditableCategory;
  depth: number;
  onUpdate: (id: string, updates: Partial<EditableCategory>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onReorderChildren: (parentId: string, event: DragEndEvent) => void;
  pendingDeletes: Set<string>;
  pendingAdds: PendingAdd[];
  onUpdatePendingAdd: (tempId: string, updates: Partial<PendingAdd>) => void;
  onDeletePendingAdd: (tempId: string) => void;
}

function SortableCategoryRow({
  category,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  onReorderChildren,
  pendingDeletes,
  pendingAdds,
  onUpdatePendingAdd,
  onDeletePendingAdd,
}: CategoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = category.children && category.children.length > 0;
  const visibleChildren = hasChildren
    ? category.children!.filter((c) => !pendingDeletes.has(c.id))
    : [];
  const isPendingDelete = pendingDeletes.has(category.id);

  if (isPendingDelete) return null;

  const childPendingAdds = pendingAdds.filter(
    (a) => a.parent_id === category.id
  );

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800",
          depth > 0 && "bg-slate-50/50 dark:bg-slate-900/50"
        )}
        style={{
          paddingLeft: depth > 0 ? `${depth * 24 + 12}px` : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ width: 20, height: 20 }}
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>

        {/* Expand/collapse chevron */}
        <button
          type="button"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          className={cn(
            "flex-shrink-0 flex items-center justify-center transition-transform duration-200",
            hasChildren
              ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              : "invisible"
          )}
          style={{ width: 20, height: 20 }}
        >
          {hasChildren && (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </button>

        {/* Native color picker */}
        <div className="flex-shrink-0" style={{ width: 24, height: 24 }}>
          <input
            type="color"
            value={category.color || "#94a3b8"}
            onChange={(e) => onUpdate(category.id, { color: e.target.value })}
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: "2px solid white",
              borderRadius: "50%",
              cursor: "pointer",
              backgroundColor: "transparent",
            }}
            title="Pick color"
          />
        </div>

        <EmojiButton
          value={category.emoji || "📁"}
          onChange={(emoji) => onUpdate(category.id, { emoji })}
        />

        {/* Name input */}
        <Input
          value={category.name}
          onChange={(e) => onUpdate(category.id, { name: e.target.value })}
          className="flex-1 h-8 text-sm border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-2 bg-transparent"
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1 w-16">
          {!category.parent_id && (
            <button
              type="button"
              onClick={() => onAddChild(category.id)}
              className="flex items-center justify-center rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ width: 24, height: 24 }}
              title="Add sub-category"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            style={{ width: 24, height: 24 }}
            title="Delete category"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Children with their own sortable context */}
      {hasChildren && isExpanded && (
        <div className="border-l-2 border-slate-200 dark:border-slate-700 ml-3">
          <DndContext
            id={`children-${category.id}`}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onReorderChildren(category.id, event)}
          >
            <SortableContext
              items={visibleChildren.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {visibleChildren.map((child) => (
                <SortableCategoryRow
                  key={child.id}
                  category={child as EditableCategory}
                  depth={depth + 1}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onReorderChildren={onReorderChildren}
                  pendingDeletes={pendingDeletes}
                  pendingAdds={pendingAdds}
                  onUpdatePendingAdd={onUpdatePendingAdd}
                  onDeletePendingAdd={onDeletePendingAdd}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Pending child adds */}
          {childPendingAdds.map((add) => (
            <PendingAddRow
              key={add.tempId}
              add={add}
              depth={depth + 1}
              onUpdate={onUpdatePendingAdd}
              onDelete={onDeletePendingAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pending Add Row ─── */

function PendingAddRow({
  add,
  depth,
  onUpdate,
  onDelete,
}: {
  add: PendingAdd;
  depth: number;
  onUpdate: (tempId: string, updates: Partial<PendingAdd>) => void;
  onDelete: (tempId: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800",
        depth > 0 && "bg-slate-50/50 dark:bg-slate-900/50"
      )}
      style={{
        paddingLeft: depth > 0 ? `${depth * 24 + 12}px` : undefined,
      }}
    >
      {/* Spacer for drag handle */}
      <div style={{ width: 20 }} />
      {/* Spacer for chevron */}
      <div style={{ width: 20 }} />

      {/* Native color picker */}
      <div className="flex-shrink-0" style={{ width: 24, height: 24 }}>
        <input
          type="color"
          value={add.color || "#94a3b8"}
          onChange={(e) => onUpdate(add.tempId, { color: e.target.value })}
          style={{
            width: 24,
            height: 24,
            padding: 0,
            border: "2px solid white",
            borderRadius: "50%",
            cursor: "pointer",
            backgroundColor: "transparent",
          }}
          title="Pick color"
        />
      </div>

      <EmojiButton
        value={add.emoji || "📁"}
        onChange={(emoji) => onUpdate(add.tempId, { emoji })}
      />

      {/* Name input */}
      <Input
        value={add.name}
        onChange={(e) => onUpdate(add.tempId, { name: e.target.value })}
        placeholder="New category name..."
        className="flex-1 h-8 text-sm border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-2 bg-transparent"
      />

      <div className="flex items-center gap-1 w-16">
        <button
          type="button"
          onClick={() => onDelete(add.tempId)}
          className="flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          style={{ width: 24, height: 24 }}
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Section Component ─── */

interface CategoryTypeSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  categories: EditableCategory[];
  pendingAdds: PendingAdd[];
  allPendingAdds: PendingAdd[];
  pendingDeletes: Set<string>;
  sectionType: "income" | "expense" | "transfer";
  onDragEnd: (e: DragEndEvent) => void;
  onUpdate: (id: string, updates: Partial<EditableCategory>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onReorderChildren: (parentId: string, event: DragEndEvent) => void;
  onUpdatePendingAdd: (tempId: string, updates: Partial<PendingAdd>) => void;
  onDeletePendingAdd: (tempId: string) => void;
  onAddCategory: () => void;
}

function CategoryTypeSection({
  title,
  isExpanded,
  onToggle,
  categories,
  pendingAdds,
  allPendingAdds,
  pendingDeletes,
  sectionType,
  onDragEnd,
  onUpdate,
  onDelete,
  onAddChild,
  onReorderChildren,
  onUpdatePendingAdd,
  onDeletePendingAdd,
  onAddCategory,
}: CategoryTypeSectionProps) {
  return (
    <div className="space-y-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-3 text-base font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-t"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>{title}</span>
        <span className="text-xs font-normal text-muted-foreground ml-1">
          ({categories.length})
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="flex items-center gap-2 py-2 px-1 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div style={{ width: 20 }} />
            <div style={{ width: 20 }} />
            <div style={{ width: 24 }} />
            <div style={{ width: 32 }} />
            <div className="flex-1">Name</div>
            <div className="w-16" />
          </div>

          <DndContext
            id={`section-${sectionType}`}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category) => (
                <SortableCategoryRow
                  key={category.id}
                  category={category}
                  depth={0}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onReorderChildren={onReorderChildren}
                  pendingDeletes={pendingDeletes}
                  pendingAdds={allPendingAdds}
                  onUpdatePendingAdd={onUpdatePendingAdd}
                  onDeletePendingAdd={onDeletePendingAdd}
                />
              ))}
            </SortableContext>
          </DndContext>

          {pendingAdds.map((add) => (
            <PendingAddRow
              key={add.tempId}
              add={add}
              depth={0}
              onUpdate={onUpdatePendingAdd}
              onDelete={onDeletePendingAdd}
            />
          ))}

          <button
            type="button"
            onClick={onAddCategory}
            className="w-full flex items-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add {title === "Transfers" ? "Transfer" : title.slice(0, -1)} Category</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Main Editor ─── */

export function CategoriesEditor({
  categories,
  onCancel,
  onSaved,
}: CategoriesEditorProps) {
  const [editingCategories, setEditingCategories] = useState<
    EditableCategory[]
  >(() => JSON.parse(JSON.stringify(categories)));
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(
    new Set()
  );
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(true);
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(true);
  const [isTransferExpanded, setIsTransferExpanded] = useState(true);
  const [isExcludedExpanded, setIsExcludedExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const expenseCategories = editingCategories.filter(
    (c) => c.type === "expense" && !c.excluded_from_budget && !pendingDeletes.has(c.id)
  );
  const incomeCategories = editingCategories.filter(
    (c) => c.type === "income" && !c.excluded_from_budget && !pendingDeletes.has(c.id)
  );
  const transferCategories = editingCategories.filter(
    (c) => c.type === "transfer" && !c.excluded_from_budget && !pendingDeletes.has(c.id)
  );
  const excludedCategories = editingCategories.filter(
    (c) => c.excluded_from_budget && !pendingDeletes.has(c.id)
  );

  const expensePendingAdds = pendingAdds.filter(
    (a) => a.categoryType === "expense" && !a.parent_id
  );
  const incomePendingAdds = pendingAdds.filter(
    (a) => a.categoryType === "income" && !a.parent_id
  );
  const transferPendingAdds = pendingAdds.filter(
    (a) => a.categoryType === "transfer" && !a.parent_id
  );

  /* ── Category updates ── */

  function updateCategory(id: string, updates: Partial<EditableCategory>) {
    function updateInList(
      list: EditableCategory[]
    ): EditableCategory[] {
      return list.map((cat) => {
        if (cat.id === id) {
          return { ...cat, ...updates };
        }
        if (cat.children) {
          return {
            ...cat,
            children: updateInList(cat.children as EditableCategory[]),
          };
        }
        return cat;
      });
    }
    setEditingCategories(updateInList(editingCategories));
  }

  function handleDelete(id: string) {
    const isPendingAddItem = pendingAdds.some((a) => a.tempId === id);
    if (isPendingAddItem) {
      setPendingAdds((adds) => adds.filter((a) => a.tempId !== id));
    } else {
      setPendingDeletes((prev) => new Set(prev).add(id));
    }
  }

  function handleAddCategory(
    categoryType: "income" | "expense" | "transfer",
    parentId: string | null = null
  ) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaultEmoji = categoryType === "income" ? "💵" : categoryType === "transfer" ? "🔁" : "📁";
    const newAdd: PendingAdd = {
      tempId,
      name: "",
      emoji: defaultEmoji,
      color: "#60a5fa",
      parent_id: parentId,
      excluded_from_budget: false,
      categoryType,
    };
    setPendingAdds((prev) => [...prev, newAdd]);
  }

  function handleAddChild(parentId: string) {
    const parent = findCategoryById(editingCategories, parentId);
    const catType = parent?.type ?? "expense";
    handleAddCategory(catType, parentId);
  }

  function findCategoryById(
    list: EditableCategory[],
    id: string
  ): EditableCategory | null {
    for (const cat of list) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(
          cat.children as EditableCategory[],
          id
        );
        if (found) return found;
      }
    }
    return null;
  }

  function handleUpdatePendingAdd(
    tempId: string,
    updates: Partial<PendingAdd>
  ) {
    setPendingAdds((adds) =>
      adds.map((a) => (a.tempId === tempId ? { ...a, ...updates } : a))
    );
  }

  function handleDeletePendingAdd(tempId: string) {
    setPendingAdds((adds) => adds.filter((a) => a.tempId !== tempId));
  }

  /* ── Drag & Drop ── */

  function handleDragEndSection(
    event: DragEndEvent,
    sectionType: "income" | "expense" | "transfer"
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEditingCategories((prev) => {
      const sectionItems = prev.filter(
        (c) =>
          c.type === sectionType &&
          !pendingDeletes.has(c.id)
      );
      const otherItems = prev.filter(
        (c) =>
          c.type !== sectionType ||
          pendingDeletes.has(c.id)
      );

      const oldIndex = sectionItems.findIndex(
        (c) => c.id === active.id
      );
      const newIndex = sectionItems.findIndex(
        (c) => c.id === over.id
      );
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(sectionItems, oldIndex, newIndex);
      const updated = reordered.map((cat, i) => ({
        ...cat,
        sort_order: i,
      }));

      return [...updated, ...otherItems];
    });
  }

  function handleReorderChildren(parentId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEditingCategories((prev) => {
      function reorderInList(
        list: EditableCategory[]
      ): EditableCategory[] {
        return list.map((cat) => {
          if (cat.id === parentId && cat.children) {
            const visibleChildren = cat.children.filter(
              (c) => !pendingDeletes.has(c.id)
            ) as EditableCategory[];
            const oldIndex = visibleChildren.findIndex(
              (c) => c.id === active.id
            );
            const newIndex = visibleChildren.findIndex(
              (c) => c.id === over!.id
            );
            if (oldIndex === -1 || newIndex === -1) return cat;

            const reordered = arrayMove(
              visibleChildren,
              oldIndex,
              newIndex
            );
            const updated = reordered.map((child, i) => ({
              ...child,
              sort_order: i,
            }));

            return { ...cat, children: updated };
          }
          if (cat.children) {
            return {
              ...cat,
              children: reorderInList(
                cat.children as EditableCategory[]
              ),
            };
          }
          return cat;
        });
      }
      return reorderInList(prev);
    });
  }

  /* ── Save ── */

  function handleSave() {
    startTransition(async () => {
      try {
        const updates: Array<{
          id: string;
          name: string;
          emoji: string | null;
          color: string | null;
          parent_id: string | null;
          excluded_from_budget: boolean;
          sort_order: number;
        }> = [];

        function collectUpdates(
          list: EditableCategory[],
          originalList: CategoryWithHierarchy[]
        ) {
          for (const cat of list) {
            const original = originalList.find((o) => o.id === cat.id);
            if (original && !pendingDeletes.has(cat.id)) {
              if (
                original.name !== cat.name ||
                original.emoji !== cat.emoji ||
                original.color !== cat.color ||
                original.excluded_from_budget !==
                  cat.excluded_from_budget ||
                original.sort_order !== cat.sort_order
              ) {
                updates.push({
                  id: cat.id,
                  name: cat.name,
                  emoji: cat.emoji,
                  color: cat.color,
                  parent_id: cat.parent_id,
                  excluded_from_budget: cat.excluded_from_budget,
                  sort_order: cat.sort_order,
                });
              }
            }
            if (cat.children && original) {
              collectUpdates(
                cat.children as EditableCategory[],
                original.children || []
              );
            }
          }
        }

        collectUpdates(editingCategories, categories);

        if (updates.length > 0) {
          await updateCategories(updates);
        }

        for (const id of pendingDeletes) {
          await deleteCategory(id);
        }

        for (const add of pendingAdds) {
          if (add.name.trim()) {
            await createCategory(
              add.name.trim(),
              add.categoryType,
              add.emoji,
              add.color,
              add.parent_id
            );
          }
        }

        onSaved();
      } catch (error) {
        console.error("Failed to save categories:", error);
      }
    });
  }

  /* ── Render ── */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Edit Categories
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Expenses Section ── */}
      <CategoryTypeSection
        title="Expenses"
        isExpanded={isExpenseExpanded}
        onToggle={() => setIsExpenseExpanded(!isExpenseExpanded)}
        categories={expenseCategories}
        pendingAdds={expensePendingAdds}
        allPendingAdds={pendingAdds}
        pendingDeletes={pendingDeletes}
        sectionType="expense"
        onDragEnd={(e) => handleDragEndSection(e, "expense")}
        onUpdate={updateCategory}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onReorderChildren={handleReorderChildren}
        onUpdatePendingAdd={handleUpdatePendingAdd}
        onDeletePendingAdd={handleDeletePendingAdd}
        onAddCategory={() => handleAddCategory("expense")}
      />

      {/* ── Income Section ── */}
      <CategoryTypeSection
        title="Income"
        isExpanded={isIncomeExpanded}
        onToggle={() => setIsIncomeExpanded(!isIncomeExpanded)}
        categories={incomeCategories}
        pendingAdds={incomePendingAdds}
        allPendingAdds={pendingAdds}
        pendingDeletes={pendingDeletes}
        sectionType="income"
        onDragEnd={(e) => handleDragEndSection(e, "income")}
        onUpdate={updateCategory}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onReorderChildren={handleReorderChildren}
        onUpdatePendingAdd={handleUpdatePendingAdd}
        onDeletePendingAdd={handleDeletePendingAdd}
        onAddCategory={() => handleAddCategory("income")}
      />

      {/* ── Transfers Section ── */}
      <CategoryTypeSection
        title="Transfers"
        isExpanded={isTransferExpanded}
        onToggle={() => setIsTransferExpanded(!isTransferExpanded)}
        categories={transferCategories}
        pendingAdds={transferPendingAdds}
        allPendingAdds={pendingAdds}
        pendingDeletes={pendingDeletes}
        sectionType="transfer"
        onDragEnd={(e) => handleDragEndSection(e, "transfer")}
        onUpdate={updateCategory}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onReorderChildren={handleReorderChildren}
        onUpdatePendingAdd={handleUpdatePendingAdd}
        onDeletePendingAdd={handleDeletePendingAdd}
        onAddCategory={() => handleAddCategory("transfer")}
      />

      {/* ── Excluded Section ── */}
      <div className="space-y-0 border-t border-dashed border-slate-300 dark:border-slate-600 pt-4 mt-4">
        <button
          type="button"
          onClick={() => setIsExcludedExpanded(!isExcludedExpanded)}
          className="w-full flex items-center gap-2 py-3 text-base font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-t"
        >
          {isExcludedExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span>Excluded</span>
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({excludedCategories.length})
          </span>
        </button>

        {isExcludedExpanded && (
          <>
            {excludedCategories.length === 0 ? (
              <p className="py-4 text-sm text-slate-400 dark:text-slate-500 text-center">
                No excluded categories. Use the eye icon on the breakdown page to exclude categories from budgets.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 py-2 px-1 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div style={{ width: 20 }} />
                  <div style={{ width: 20 }} />
                  <div style={{ width: 24 }} />
                  <div style={{ width: 32 }} />
                  <div className="flex-1">Name</div>
                  <div className="w-16" />
                </div>

                {excludedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="group flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800 opacity-60"
                  >
                    {/* Spacer for drag handle */}
                    <div style={{ width: 20 }} />
                    {/* Spacer for chevron */}
                    <div style={{ width: 20 }} />

                    {/* Native color picker */}
                    <div className="flex-shrink-0" style={{ width: 24, height: 24 }}>
                      <input
                        type="color"
                        value={category.color || "#94a3b8"}
                        onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          border: "2px solid white",
                          borderRadius: "50%",
                          cursor: "pointer",
                          backgroundColor: "transparent",
                        }}
                        title="Pick color"
                      />
                    </div>

                    <EmojiButton
                      value={category.emoji || "📁"}
                      onChange={(emoji) => updateCategory(category.id, { emoji })}
                    />

                    {/* Name input */}
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                      className="flex-1 h-8 text-sm border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-2 bg-transparent"
                    />

                    {/* Type badge */}
                    <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                      {category.type}
                    </span>

                    {/* Delete */}
                    <div className="flex items-center gap-1 w-16">
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        className="flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        style={{ width: 24, height: 24 }}
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
