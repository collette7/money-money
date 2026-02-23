import { PiggyBank, Target } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { getGoals } from "./actions"
import { GoalCard } from "./goal-card"
import { CreateGoalDialog } from "./create-goal-dialog"

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export default async function GoalsPage() {
  const goals = await getGoals()

  const activeGoals = goals.filter((g) => g.status === "active")
  const completedGoals = goals.filter((g) => g.status === "completed")
  const pausedGoals = goals.filter((g) => g.status === "paused")

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Savings Goals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set targets and track progress toward your financial goals.
          </p>
        </div>
        <CreateGoalDialog />
      </div>

      {goals.length > 0 && (
        <div className="rounded-xl border p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-medium">Overall Progress</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {currency(totalSaved)} of {currency(totalTarget)} (
              {Math.round(overallPct)}%)
            </p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
            <span>{activeGoals.length} active</span>
            <span>{completedGoals.length} completed</span>
            {pausedGoals.length > 0 && (
              <span>{pausedGoals.length} paused</span>
            )}
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon={<PiggyBank className="size-6" />}
            title="No savings goals yet"
            description="Create a goal to track your progress towards saving for something important to you. Use the New Goal button above to get started."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {pausedGoals.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Paused
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pausedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Completed
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
