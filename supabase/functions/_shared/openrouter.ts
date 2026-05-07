// OpenRouter smart multi-model router for Zara
// Auto-picks best model by task (coding / long-context / fast / creative / general)
// Skips ALL Google Gemini models (Gemini integrated separately via Lovable AI Gateway)

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

export type Task = "coding" | "long" | "fast" | "creative" | "general";

// Curated OpenRouter model IDs (no Gemini). Order = preference within category.
const MODELS: Record<Task, string[]> = {
  coding: [
    "deepseek/deepseek-chat-v3.1:free",
    "mistralai/mistral-large-2411",
    "openai/gpt-4o-mini",
    "deepseek/deepseek-coder",
  ],
  long: [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "mistralai/mistral-large-2411",
    "openai/gpt-4o",
  ],
  fast: [
    "meta-llama/llama-3.3-70b-instruct",
    "openai/gpt-4o-mini",
    "mistralai/mistral-small-latest",
  ],
  creative: [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "x-ai/grok-2-1212",
  ],
  general: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-haiku",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-latest",
  ],
};

const CODE_RX = /\b(code|coding|debug|bug|error|stack ?trace|function|api|sql|regex|python|javascript|typescript|react|node|java|c\+\+|html|css|html5|json|compile|syntax|runtime)\b|```/i;
const CREATIVE_RX = /\b(story|poem|shayri|shayari|lyrics|song|tagline|caption|joke|funny|imagine|romantic|love letter)\b/i;
const FAST_RX = /^(hi|hello|hey|ok|okay|thanks|thank you|bye|good (morning|night|afternoon)|gm|gn)\b/i;

export function detectTask(userMessage: string): Task {
  const t = userMessage || "";
  if (t.length > 1500) return "long";
  if (CODE_RX.test(t)) return "coding";
  if (FAST_RX.test(t.trim()) && t.length < 60) return "fast";
  if (CREATIVE_RX.test(t)) return "creative";
  return "general";
}

/**
 * Try OpenRouter with smart routing + cross-model fallback.
 * Returns reply text, or null if all attempts fail (caller should fall back to Groq/Gemini).
 */
export async function routeOpenRouter(
  userMessage: string,
  systemPrompt: string,
  maxTokens?: number,
  taskOverride?: Task,
): Promise<{ text: string; model: string } | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;

  const task = taskOverride || detectTask(userMessage);
  const models = MODELS[task];

  for (const model of models) {
    try {
      const r = await fetch(OR_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zaraai.in",
          "X-Title": "Zara AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.9,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
      });
      if (!r.ok) {
        console.error(`OpenRouter ${model} failed:`, r.status);
        continue;
      }
      const d = await r.json();
      const txt = d?.choices?.[0]?.message?.content;
      if (txt && typeof txt === "string" && txt.trim()) {
        return { text: txt, model };
      }
    } catch (e) {
      console.error(`OpenRouter ${model} exception:`, e);
      continue;
    }
  }
  return null;
}
