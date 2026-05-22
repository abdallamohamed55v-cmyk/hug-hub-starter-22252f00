// Shared helper: route AI calls to OpenRouter using the key stored in
// public.api_keys (service='openrouter' or 'agentrouter').
// Falls back to LOVABLE_API_KEY + Lovable Gateway if no router key is available.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AGENTROUTER_URL = "https://agentrouter.org/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

let cached: { url: string; key: string; expiry: number } | null = null;
const TTL_MS = 5 * 60_000;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Returns { url, key } for the best available LLM endpoint for OpenRouter-style models. */
export async function getRouter(): Promise<{ url: string; key: string } | null> {
  if (cached && Date.now() < cached.expiry) return { url: cached.url, key: cached.key };

  // Try explicit OpenRouter first, then agentrouter
  try {
    const sb = admin();
    const { data } = await sb
      .from("api_keys")
      .select("service, api_key")
      .in("service", ["openrouter", "agentrouter"])
      .eq("is_active", true)
      .eq("is_blocked", false)
      .limit(10);
    if (data && data.length) {
      // Prefer openrouter
      const or = data.find((d: any) => d.service === "openrouter") ?? data[0];
      const url = or.service === "agentrouter" ? AGENTROUTER_URL : OPENROUTER_URL;
      cached = { url, key: or.api_key, expiry: Date.now() + TTL_MS };
      return { url, key: or.api_key };
    }
  } catch (e) {
    console.warn("[llm-router] getRouter db error:", (e as Error).message);
  }

  const env = Deno.env.get("OPENROUTER_API_KEY");
  if (env) {
    cached = { url: OPENROUTER_URL, key: env, expiry: Date.now() + TTL_MS };
    return { url: OPENROUTER_URL, key: env };
  }
  return null;
}

/** Returns the Lovable Gateway endpoint (fallback). */
export function getLovableFallback(): { url: string; key: string } | null {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  return { url: LOVABLE_URL, key };
}

/** Default model assignments (centralized). */
export const ROUTER_MODELS = {
  slides:       "deepseek/deepseek-v4-flash",
  docs:         "deepseek/deepseek-v4-flash",
  deepResearch: "deepseek/deepseek-v4-flash",
  coding:       "moonshotai/kimi-k2.6",
} as const;

/** Map an OpenRouter model to a safe Lovable Gateway equivalent for fallback. */
export function lovableEquivalent(model: string): string {
  if (model.startsWith("deepseek/")) return "google/gemini-2.5-flash";
  if (model.startsWith("moonshotai/") || model.startsWith("kimi")) return "openai/gpt-5-mini";
  if (model.startsWith("anthropic/")) return "openai/gpt-5";
  return "google/gemini-2.5-flash";
}
