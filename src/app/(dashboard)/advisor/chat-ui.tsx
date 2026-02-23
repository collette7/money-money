"use client"

import {
  Bot,
  Loader2,
  MessageSquare,
  Menu,
  Plus,
  Send,
  Sparkles,
  User,
  X,
  Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatUI, SUGGESTED_PROMPTS, dateFormatter, type Conversation } from "./use-chat-ui"

export function ChatUI({
  conversations: initialConversations,
}: {
  conversations: Conversation[]
}) {
  const {
    conversations,
    activeConversationId,
    input,
    setInput,
    isLoading,
    error,
    setError,
    sidebarOpen,
    setSidebarOpen,
    deletingId,
    showDeleteConfirm,
    setShowDeleteConfirm,
    scrollRef,
    textareaRef,
    visibleMessages,
    hasConversation,
    loadConversation,
    startNewConversation,
    handleDelete,
    handleSend,
    handleKeyDown,
  } = useChatUI(initialConversations)

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-xl border bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0 lg:w-72",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-sm font-semibold tracking-tight">
              Conversations
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={startNewConversation}
              title="New conversation"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 p-2">
            {conversations.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No conversations yet.
                <br />
                Start one below!
              </p>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId
                const isDeleting = deletingId === conv.id
                const showConfirm = showDeleteConfirm === conv.id
                
                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className="flex flex-1 items-center gap-2.5"
                      disabled={isDeleting}
                    >
                      <MessageSquare className="size-3.5 shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-medium">
                          Conversation
                        </span>
                        <span className="text-[10px] opacity-60">
                          {dateFormatter.format(new Date(conv.updated_at))}
                        </span>
                      </div>
                    </button>
                    
                    {showConfirm ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(conv.id)}
                          disabled={isDeleting}
                          className="text-destructive hover:bg-destructive/20"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setShowDeleteConfirm(null)}
                          disabled={isDeleting}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowDeleteConfirm(conv.id)
                              }}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">Delete conversation</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon-xs"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <Bot className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">
                Financial Advisor
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                AI-powered insights about your finances
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="shrink-0 rounded p-0.5 hover:bg-destructive/20"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-1 px-4 py-6">
            {!hasConversation && !isLoading ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center py-16">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
                  <Sparkles className="size-7 text-white" />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-tight">
                  Ask your financial advisor
                </h2>
                <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground">
                  Get personalized insights about your spending, budgets, goals,
                  and more.
                </p>

                <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {visibleMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3 py-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                        <Bot className="size-3.5 text-white" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
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
                            components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>,
                            pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs last:mb-0">{children}</pre>,
                            h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
                            h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
                            h3: ({ children }) => <h3 className="mb-2 text-sm font-bold">{children}</h3>,
                            blockquote: ({ children }) => <blockquote className="mb-2 border-l-4 border-muted-foreground/30 pl-3 italic">{children}</blockquote>,
                            a: ({ href, children }) => <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            hr: () => <hr className="my-2 border-muted-foreground/30" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10">
                        <User className="size-3.5 text-foreground/70" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 py-2">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                      <Bot className="size-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-card px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances…"
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
          <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] text-muted-foreground/60">
            AI may make mistakes. Verify important financial information.
          </p>
        </div>
      </div>
    </div>
  )
}
