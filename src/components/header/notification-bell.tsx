"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  DollarSign,
  Info,
  Trophy,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(dashboard)/settings/actions"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

const TYPE_ICONS: Record<string, typeof DollarSign> = {
  large_transaction: DollarSign,
  budget_warning: AlertTriangle,
  budget_exceeded: AlertCircle,
  goal_milestone: Trophy,
  system: Info,
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`

  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diffMs / 86_400_000)
  return `${days}d ago`
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getNotifications()
      .then((data) => {
        setNotifications(data as Notification[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const handleMarkRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  const displayed = notifications.slice(0, 10)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <CheckCircle2 className="size-8 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {displayed.map((notification) => {
                const Icon =
                  TYPE_ICONS[notification.type] ?? Info

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/80 ${
                      !notification.is_read ? "bg-muted/50" : ""
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkRead(notification.id)
                      }
                    }}
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      <p
                        className={`truncate text-sm leading-tight ${
                          !notification.is_read
                            ? "font-semibold"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground leading-snug">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export { NotificationBell }
