"use client"

import { Settings, Key, Globe, Bot, LogOut, Save, Loader2, Check, Edit2, Trash2, User } from "lucide-react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useSettingsForm, PROVIDER_MODELS } from "./use-settings-form"
import type { SettingsFormProps } from "./use-settings-form"

function SettingsForm({ currentSettings, userEmail, firstName: initialFirstName, lastName: initialLastName }: SettingsFormProps) {
  const {
    provider,
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
    isEditingApiKey,
    savedHasApiKey,
    handleProviderChange,
    canSave,
    handleSave,
    handleClearApiKey,
    handleSignOut,
    handleStartEditingApiKey,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isSavingProfile,
    profileStatus,
    profileError,
    handleSaveProfile,
  } = useSettingsForm({ currentSettings, userEmail, firstName: initialFirstName, lastName: initialLastName })

  return (
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="mb-6 w-full sm:w-auto">
        <TabsTrigger value="ai" className="gap-1.5">
          <Bot className="size-3.5" />
          AI Configuration
        </TabsTrigger>
        <TabsTrigger value="account" className="gap-1.5">
          <Settings className="size-3.5" />
          Account
        </TabsTrigger>
      </TabsList>

      {/* ─── AI Configuration ─── */}
      <TabsContent value="ai" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" />
              AI Provider
            </CardTitle>
            <CardDescription>
              Choose your preferred AI provider and configure access credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider" className="w-full sm:w-64">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                  <SelectItem value="gemini">Google Gemini (Beta)</SelectItem>
                  <SelectItem value="minimax">Minimax (Beta)</SelectItem>
                  <SelectItem value="moonshot">Kimi (Moonshot) (Beta)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-1.5">
                <Key className="size-3.5" />
                API Key
              </Label>
              {isEditingApiKey ? (
                <div className="space-y-2">
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="sm:w-96"
                    autoFocus
                  />
                  {savedHasApiKey && (
                    <p className="text-muted-foreground text-xs">
                      Currently saved: API key is configured
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="apiKey"
                    type="text"
                    value={savedHasApiKey ? "••••••••••••••••" : "No API key set"}
                    readOnly
                    disabled
                    className="sm:w-96"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditingApiKey}
                  >
                    <Edit2 className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isClearing}
                    onClick={handleClearApiKey}
                  >
                    {isClearing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model" className="w-full sm:w-64">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {(PROVIDER_MODELS[provider] ?? []).map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-1.5">
                <Globe className="size-3.5" />
                Base URL
                {provider === "ollama" && (
                  <span className="text-destructive text-xs">*&nbsp;required</span>
                )}
              </Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  provider === "ollama"
                    ? "http://localhost:11434"
                    : "Optional — custom endpoint or proxy URL"
                }
                className="sm:w-96"
              />
              {provider === "ollama" && (
                <p className="text-muted-foreground text-xs">
                  Ollama requires a base URL. The default is http://localhost:11434
                </p>
              )}
            </div>

            <Separator />

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving || !canSave()}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Settings
                  </>
                )}
              </Button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <Check className="size-3.5" />
                  Settings saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                  <span className="size-3.5">×</span>
                  {statusMessage}
                </span>
              )}
              {saveStatus === "warning" && (
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <span className="size-3.5">!</span>
                  {statusMessage}
                </span>
              )}
            </div>
            
            {(provider === "gemini" || provider === "minimax" || provider === "moonshot") && (
              <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Provider Compatibility:</p>
                <p>{provider === "moonshot" ? "Kimi" : provider.charAt(0).toUpperCase() + provider.slice(1)} uses an OpenAI-compatible API. Your settings will be preserved and the correct endpoint will be used automatically.</p>
                {provider === "moonshot" && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Important: Moonshot/Kimi Platform</p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      If your API key is from:
                    </p>
                    <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                      <li><strong>platform.moonshot.cn</strong> → Use base URL: https://api.moonshot.cn/v1</li>
                      <li><strong>platform.moonshot.ai</strong> → Change base URL to: https://api.moonshot.ai/v1</li>
                    </ul>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      401 errors usually mean wrong platform endpoint for your API key.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Account ─── */}
      <TabsContent value="account" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Profile
            </CardTitle>
            <CardDescription>
              Your name and account details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm">{userEmail || "Signed in"}</p>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile || !firstName.trim()}>
                {isSavingProfile ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Profile
                  </>
                )}
              </Button>
              {profileStatus === "saved" && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <Check className="size-3.5" />
                  Profile updated!
                </span>
              )}
              {profileStatus === "error" && (
                <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                  <span className="size-3.5">×</span>
                  {profileError}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Signing out will end your current session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOut className="size-4" />
                  Sign Out
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export { SettingsForm }
