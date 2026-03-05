"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Loader2, Send, Sparkles, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { sendBudgetAdvisorMessage } from "@/app/(dashboard)/budgets/advisor-actions"

const SUGGESTED_PROMPTS = [
  "How's my budget this month?",
  "Which categories should I cut back on?",
  "Am I saving enough for my goals?",
  "What should I change for next month?",
]

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-1 text-sm">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string
    children?: React.ReactNode
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:no-underline"
    >
      {children}
    </a>
  ),
}

interface BudgetAdvisorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: number
  year: number
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function BudgetAdvisorSheet({
  open,
  onOpenChange,
  month,
  year,
}: BudgetAdvisorSheetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = useCallback(
    async (overrideMessage?: string) => {
      const text = (overrideMessage ?? input).trim()
      if (!text || isLoading) return

      setInput("")
      setError(null)
      setMessages((prev) => [...prev, { role: "user", content: text }])
      setIsLoading(true)

      try {
        const result = await sendBudgetAdvisorMessage(
          conversationId,
          text,
          month,
          year
        )
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply },
        ])
        if (result.conversationId) {
          setConversationId(result.conversationId)
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong"
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, conversationId, month, year]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const hasMessages = messages.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <Sparkles className="size-4 text-white" />
            </div>
            <SheetTitle className="text-base">Budget Advisor</SheetTitle>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-1 py-4"
        >
          {!hasMessages && !isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
                <Sparkles className="size-6 text-white" />
              </div>
              <p className="mt-4 max-w-xs text-center text-sm text-muted-foreground">
                Ask me anything about your budget — spending trends, savings
                tips, or how to optimize your categories.
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="rounded-xl border bg-card px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 py-1.5",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="markdown-content [&>*:last-child]:mb-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 py-1.5">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mx-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="flex-1 text-xs">{error}</span>
            <button
              onClick={() => setError(null)}
              className="shrink-0 rounded p-0.5 hover:bg-destructive/20"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="border-t px-2 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your budget…"
              rows={1}
              className="min-h-10 max-h-32 resize-none rounded-xl border-none bg-muted/60 px-4 py-2.5 text-sm shadow-none focus-visible:ring-1"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
            AI may make mistakes. Verify important financial information.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
