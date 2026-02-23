import { useCallback, useEffect, useRef, useState } from "react"
import { sendChatMessage, getConversation, deleteConversation } from "./actions"

export type AIMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type Conversation = {
  id: string
  created_at: string
  updated_at: string
}

type ConversationWithMessages = {
  id: string
  messages: AIMessage[]
  created_at: string
}

export const SUGGESTED_PROMPTS = [
  "How's my budget this month?",
  "Where am I spending the most?",
  "Help me create a savings plan",
  "Am I on track with my goals?",
]

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export function useChatUI(initialConversations: Conversation[]) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [])

  const visibleMessages = messages.filter((m) => m.role !== "system")
  const hasConversation = visibleMessages.length > 0

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (textareaRef.current && !hasConversation) {
      textareaRef.current.focus()
    }
  }, [])

  async function loadConversation(conversationId: string) {
    setError(null)
    setIsLoading(true)
    try {
      const data = await getConversation(conversationId)
      if (data) {
        const conv = data as ConversationWithMessages
        setActiveConversationId(conv.id)
        setMessages(conv.messages)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load conversation"
      )
    } finally {
      setIsLoading(false)
      setSidebarOpen(false)
    }
  }

  function startNewConversation() {
    setActiveConversationId(null)
    setMessages([])
    setInput("")
    setError(null)
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }

  async function handleDelete(conversationId: string) {
    setDeletingId(conversationId)
    setError(null)
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (activeConversationId === conversationId) {
        startNewConversation()
      }
      setShowDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete conversation")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim()
    if (!messageText || isLoading) return

    setError(null)
    setInput("")

    const userMessage: AIMessage = { role: "user", content: messageText }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)
    try {
      const result = await sendChatMessage(activeConversationId, messageText)

      if (result.conversationId && !activeConversationId) {
        setActiveConversationId(result.conversationId)
        setConversations((prev) => [
          {
            id: result.conversationId!,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: result.reply,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return {
    conversations,
    activeConversationId,
    messages,
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
  }
}
