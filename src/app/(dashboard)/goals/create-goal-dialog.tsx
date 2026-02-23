"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createGoal } from "./actions"

const PRESET_COLORS = [
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#f97316",
]

const PRESET_ICONS = ["🏠", "🚗", "✈️", "🎓", "💰", "🏖️", "💻", "🎯", "🏥", "👶"]

function CreateGoalDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("color", selectedColor)
    formData.set("icon", selectedIcon)

    startTransition(async () => {
      await createGoal(formData)
      setOpen(false)
      setSelectedColor(PRESET_COLORS[0])
      setSelectedIcon("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Savings Goal</DialogTitle>
          <DialogDescription>
            Set a target and track your progress over time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              name="name"
              placeholder="e.g. Emergency Fund"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target Amount ($)</Label>
              <Input
                id="goal-target"
                name="targetAmount"
                type="number"
                min={1}
                step={100}
                placeholder="10000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-current">Current Amount ($)</Label>
              <Input
                id="goal-current"
                name="currentAmount"
                type="number"
                min={0}
                step={100}
                placeholder="0"
                defaultValue="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Deadline (optional)</Label>
            <Input id="goal-deadline" name="deadline" type="date" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-contribution">Contribution ($)</Label>
              <Input
                id="goal-contribution"
                name="contributionAmount"
                type="number"
                min={0}
                step={25}
                placeholder="200"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select name="contributionFrequency" defaultValue="monthly">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`flex size-9 items-center justify-center rounded-lg border text-lg transition-all ${
                    selectedIcon === icon
                      ? "border-primary bg-primary/10 ring-primary/30 ring-2"
                      : "hover:bg-accent"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`size-7 rounded-full transition-all ${
                    selectedColor === color
                      ? "ring-2 ring-offset-2"
                      : "hover:scale-110"
                  }`}
                   style={{
                     backgroundColor: color,
                     outlineColor: color,
                   }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateGoalDialog }
