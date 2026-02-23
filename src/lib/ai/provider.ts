import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AISettings {
  provider: "openai" | "anthropic" | "ollama" | "gemini" | "minimax" | "moonshot";
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
}

export async function getAISettings(userId: string): Promise<AISettings | null> {
  const supabase = await createClient();

  let query = supabase
    .from("ai_settings")
    .select("provider, api_key, base_url, model, metadata")
    .eq("user_id", userId)
    .single();

  let { data, error } = await query;
  
  if (error && error.message.includes("metadata")) {
    const { data: basicData } = await supabase
      .from("ai_settings")
      .select("provider, api_key, base_url, model")
      .eq("user_id", userId)
      .single();
    data = basicData ? { ...basicData, metadata: null } : null;
  }

  if (!data || !data.api_key) return null;

  let effectiveProvider = data.provider;
  
  if (data.metadata && typeof data.metadata === 'object') {
    const metadata = data.metadata as Record<string, any>;
    if (metadata.original_provider) {
      effectiveProvider = metadata.original_provider;
    }
  }

  let decryptedKey: string | null = data.api_key;
  if (data.api_key) {
    try {
      decryptedKey = decrypt(data.api_key);
    } catch {
      // Fallback: key may be stored in plaintext (pre-encryption migration)
      decryptedKey = data.api_key;
    }
  }

  return {
    provider: effectiveProvider as AISettings['provider'],
    apiKey: decryptedKey,
    baseUrl: data.base_url,
    model: data.model,
  };
}

export async function chatCompletion(
  settings: AISettings,
  messages: AIMessage[]
): Promise<string> {
  switch (settings.provider) {
    case "openai":
    case "gemini":
    case "minimax":
    case "moonshot":
      return openaiChat(settings, messages);
    case "anthropic":
      return anthropicChat(settings, messages);
    case "ollama":
      return ollamaChat(settings, messages);
    default:
      throw new Error(`Unsupported provider: ${settings.provider}`);
  }
}

async function openaiChat(
  settings: AISettings,
  messages: AIMessage[]
): Promise<string> {
  const defaultBaseUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
    minimax: "https://api.minimax.chat/v1",
    moonshot: "https://api.moonshot.ai/v1",
  };
  const baseUrl = settings.baseUrl || defaultBaseUrls[settings.provider] || "https://api.openai.com/v1";
  


  const isKimiK2Model = settings.model.startsWith('kimi-k2');
  const temperature = isKimiK2Model ? 1 : 0.3;
  
  const requestBody = {
    model: settings.model,
    messages,
    temperature,
    max_tokens: 2048,
  };
  
  const authHeader = `Bearer ${settings.apiKey}`;
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${settings.provider.toUpperCase()} API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function anthropicChat(
  settings: AISettings,
  messages: AIMessage[]
): Promise<string> {
  const baseUrl = settings.baseUrl ?? "https://api.anthropic.com";
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2048,
      system: systemMsg?.content,
      messages: nonSystemMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function ollamaChat(
  settings: AISettings,
  messages: AIMessage[]
): Promise<string> {
  const baseUrl = settings.baseUrl ?? "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.message.content;
}
