"use client"

import {
  Calendar,
  Clock,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContributionDialog } from "./contribution-dialog"
import {
  useGoalCard,
  currency,
  formatDate,
  frequencyLabel,
  type Goal,
  type Contribution,
} from "./use-goal-card"

function GoalCard({ goal }: { goal: Goal }) {
  const {
    detailOpen,
    setDetailOpen,
    contributions,
    loadingContributions,
    isPending,
    pct,
    accentColor,
    days,
    projected,
    statusVariant,
    handleStatusToggle,
    handleDelete,
  } = useGoalCard({ goal })

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setDetailOpen(true)}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-center gap-2.5">
            {goal.icon && (
              <div
                className="flex size-10 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${accentColor}18` }}
              >
                {goal.icon}
              </div>
            )}
            <div>
              <CardTitle className="text-base">{goal.name}</CardTitle>
              <Badge variant={statusVariant} className="mt-1 capitalize">
                {goal.status}
              </Badge>
            </div>
          </div>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: accentColor }}
          >
            {Math.round(pct)}%
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>

          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold tabular-nums">
                {currency(goal.current_amount)}
              </span>{" "}
              of {currency(goal.target_amount)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {goal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {days !== null && days > 0
                  ? `${days} days left`
                  : days === 0
                    ? "Due today"
                    : "Past due"}
              </span>
            )}
            {!goal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                No deadline
              </span>
            )}
            {goal.contribution_amount && goal.contribution_amount > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {currency(goal.contribution_amount)}
                {frequencyLabel(goal.contribution_frequency)}
              </span>
            )}
          </div>

          {projected && (
            <p className="text-muted-foreground text-xs">
              Projected completion: {projected}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {goal.icon && <span className="text-xl">{goal.icon}</span>}
              {goal.name}
            </DialogTitle>
            <DialogDescription>
              {currency(goal.current_amount)} of{" "}
              {currency(goal.target_amount)} saved ({Math.round(pct)}%)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <ContributionDialog goalId={goal.id} goalName={goal.name} />
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusToggle()
                }}
                disabled={isPending || goal.status === "completed"}
              >
                {goal.status === "active" ? (
                  <>
                    <Pause className="size-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" /> Resume
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Contribution History
              </h4>
              {loadingContributions ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Loading…
                </p>
              ) : contributions.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No contributions yet.
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-3">
                    {contributions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium tabular-nums">
                            +{currency(c.amount)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(c.date)}
                            {c.notes && ` · ${c.notes}`}
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {c.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { GoalCard }
