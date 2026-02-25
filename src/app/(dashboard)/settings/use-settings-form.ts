"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { saveAISettings, signOut, clearAIApiKey, updateProfile } from "./actions"

export interface SettingsFormProps {
  currentSettings: {
    provider: string
    hasApiKey: boolean
    baseUrl: string | null
    model: string | null
  } | null
  userEmail: string
  firstName: string
  lastName: string
}

export const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "o3-mini", label: "o3 Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro" },
  ],
  minimax: [
    { value: "MiniMax-Text-01", label: "MiniMax Text 01" },
  ],
  moonshot: [
    { value: "kimi-k2.5", label: "Kimi K2.5 (Latest)" },
    { value: "kimi-k2-turbo-preview", label: "Kimi K2 Turbo" },
    { value: "kimi-k2-thinking", label: "Kimi K2 Thinking" },
    { value: "kimi-k2-thinking-turbo", label: "Kimi K2 Thinking Turbo" },
    { value: "kimi-k2-0905-preview", label: "Kimi K2 Preview" },
    { value: "moonshot-v1-8k", label: "Moonshot v1 8K" },
    { value: "moonshot-v1-32k", label: "Moonshot v1 32K" },
    { value: "moonshot-v1-128k", label: "Moonshot v1 128K" },
  ],
  ollama: [
    { value: "llama3", label: "Llama 3" },
    { value: "llama3.1", label: "Llama 3.1" },
    { value: "mistral", label: "Mistral" },
    { value: "codellama", label: "Code Llama" },
    { value: "gemma2", label: "Gemma 2" },
    { value: "phi3", label: "Phi 3" },
  ],
}

const DEFAULT_MODELS: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_MODELS).map(([key, models]) => [key, models[0].value])
)

export function useSettingsForm({ currentSettings, userEmail, firstName: initialFirstName, lastName: initialLastName }: SettingsFormProps) {
  const initialProvider = currentSettings?.provider ?? "openai"
  const [provider, setProvider] = useState(initialProvider)
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState(currentSettings?.baseUrl ?? "")
  const [model, setModel] = useState(currentSettings?.model ?? DEFAULT_MODELS[initialProvider] ?? DEFAULT_MODELS.openai)
  const [isSaving, startSaveTransition] = useTransition()
  const [isSigningOut, startSignOutTransition] = useTransition()
  const [isClearing, startClearTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "warning" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isEditingApiKey, setIsEditingApiKey] = useState(!currentSettings?.hasApiKey)
  const [savedHasApiKey, setSavedHasApiKey] = useState(currentSettings?.hasApiKey || false)
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [isSavingProfile, startProfileTransition] = useTransition()
  const [profileStatus, setProfileStatus] = useState<"idle" | "saved" | "error">("idle")
  const [profileError, setProfileError] = useState("")

  const handleProviderChange = useCallback(
    (value: string) => {
      setProvider(value)
      setModel(DEFAULT_MODELS[value] ?? "")
      setIsEditingApiKey(true)

      const defaultBaseUrls: Record<string, string> = {
        ollama: "http://localhost:11434",
        gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
        minimax: "https://api.minimax.chat/v1",
        moonshot: "https://api.moonshot.cn/v1",
      }
      if (defaultBaseUrls[value]) {
        setBaseUrl(defaultBaseUrls[value])
      } else {
        setBaseUrl("")
      }
      
      setErrorMessage("")
      setStatusMessage("")
      setSaveStatus("idle")
    },
    []
  )

  useEffect(() => {
    if (saveStatus === "saved" || saveStatus === "error" || saveStatus === "warning") {
      const timer = setTimeout(() => {
        setSaveStatus("idle")
        setStatusMessage("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  useEffect(() => {
    if (profileStatus === "saved" || profileStatus === "error") {
      const timer = setTimeout(() => {
        setProfileStatus("idle")
        setProfileError("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [profileStatus])

  const canSave = useCallback(() => {
    if (!provider || !model) return false
    
    if (provider === "ollama" && (!baseUrl || !baseUrl.trim())) {
      return false
    }
    
    const needsApiKey = !currentSettings?.hasApiKey || 
                       (currentSettings?.provider !== provider && !apiKey);
                       
    if (needsApiKey && (!apiKey || !apiKey.trim())) {
      return false
    }
    
    return true
  }, [provider, model, baseUrl, currentSettings?.hasApiKey, currentSettings?.provider, apiKey])

  const handleSave = () => {
    if (!provider.trim()) return

    const formData = new FormData()
    formData.set("provider", provider)
    formData.set("apiKey", apiKey)
    formData.set("baseUrl", baseUrl || "")
    formData.set("model", model)

    startSaveTransition(async () => {
      const result = await saveAISettings(formData)
      if (result?.success) {
        setSaveStatus("saved")
        setStatusMessage("")
        
        if (apiKey) {
          setSavedHasApiKey(true)
          setIsEditingApiKey(false)
        }
        
        if ('savedProvider' in result && result.savedProvider) {
          setProvider(result.savedProvider)
        }
      } else {
        setSaveStatus("error")
        setStatusMessage(result?.error || "Failed to save settings. Please try again.")
      }
    })
  }

  const handleClearApiKey = () => {
    startClearTransition(async () => {
      const result = await clearAIApiKey()
      if (result?.success) {
        setApiKey("")
        setSavedHasApiKey(false)
        setIsEditingApiKey(true)
        setSaveStatus("saved")
        setStatusMessage("API key cleared")
      } else {
        setSaveStatus("error")
        setStatusMessage(result?.error || "Failed to clear API key")
      }
    })
  }

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await signOut()
    })
  }

  const handleStartEditingApiKey = () => {
    setIsEditingApiKey(true)
    setApiKey("")
  }

  const handleSaveProfile = () => {
    if (!firstName.trim()) return

    const formData = new FormData()
    formData.set("firstName", firstName)
    formData.set("lastName", lastName)

    startProfileTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.success) {
        setProfileStatus("saved")
        setProfileError("")
      } else {
        setProfileStatus("error")
        setProfileError(result?.error || "Failed to update name")
      }
    })
  }

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    isSaving,
    isSigningOut,
    isClearing,
    saveStatus,
    statusMessage,
    errorMessage,
    isEditingApiKey,
    setIsEditingApiKey,
    savedHasApiKey,
    handleProviderChange,
    canSave,
    handleSave,
    handleClearApiKey,
    handleSignOut,
    handleStartEditingApiKey,
    userEmail,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isSavingProfile,
    profileStatus,
    profileError,
    handleSaveProfile,
  }
}
