"use client"

import { useState } from "react"
import { MoreHorizontal, FolderPlus, Edit, Trash } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CategoryFormDialog } from "@/components/category-form-dialog"

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}

interface CategoryContextMenuProps {
  category: Category
  onStartNewGroup: (categoryId: string) => void
}

export function CategoryContextMenu({ category, onStartNewGroup }: CategoryContextMenuProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onStartNewGroup(category.id)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>Start new group</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit category</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <CategoryFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        isGroupCreation={true}
      />
    </>
  )
}