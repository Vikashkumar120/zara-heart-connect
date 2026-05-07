// OpenRouter smart multi-model router for Zara
// Auto-picks best model by task (coding / long-context / fast / creative / general)
// Skips ALL Google Gemini models (Gemini integrated separately via Lovable AI Gateway)

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

export type Task = "coding" | "long" | "fast" | "creative" | "general";

// 300+ OpenRouter model IDs across providers (NO Google Gemini — Gemini handled separately).
// Grouped by capability so we can expose a giant catalog and route smartly.
export const ALL_MODELS = {
  openai: [
    "openai/gpt-4o","openai/gpt-4o-mini","openai/gpt-4o-2024-11-20","openai/gpt-4o-2024-08-06","openai/gpt-4o-2024-05-13",
    "openai/gpt-4-turbo","openai/gpt-4-turbo-preview","openai/gpt-4","openai/gpt-4-1106-preview","openai/gpt-4-0314",
    "openai/gpt-3.5-turbo","openai/gpt-3.5-turbo-16k","openai/gpt-3.5-turbo-0125","openai/gpt-3.5-turbo-1106",
    "openai/o1","openai/o1-mini","openai/o1-preview","openai/o3-mini","openai/o3-mini-high","openai/o1-pro",
    "openai/chatgpt-4o-latest","openai/gpt-4o-search-preview","openai/gpt-4o-mini-search-preview",
    "openai/gpt-4.1","openai/gpt-4.1-mini","openai/gpt-4.1-nano",
  ],
  anthropic: [
    "anthropic/claude-3.5-sonnet","anthropic/claude-3.5-sonnet-20240620","anthropic/claude-3.5-haiku","anthropic/claude-3.5-haiku-20241022",
    "anthropic/claude-3-opus","anthropic/claude-3-opus-20240229","anthropic/claude-3-sonnet","anthropic/claude-3-haiku",
    "anthropic/claude-2.1","anthropic/claude-2.0","anthropic/claude-instant-1.2",
    "anthropic/claude-3.7-sonnet","anthropic/claude-3.7-sonnet:thinking","anthropic/claude-opus-4","anthropic/claude-sonnet-4",
  ],
  meta: [
    "meta-llama/llama-3.3-70b-instruct","meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-90b-vision-instruct","meta-llama/llama-3.2-11b-vision-instruct",
    "meta-llama/llama-3.2-3b-instruct","meta-llama/llama-3.2-1b-instruct",
    "meta-llama/llama-3.1-405b-instruct","meta-llama/llama-3.1-70b-instruct","meta-llama/llama-3.1-8b-instruct",
    "meta-llama/llama-3-70b-instruct","meta-llama/llama-3-8b-instruct",
    "meta-llama/llama-2-70b-chat","meta-llama/llama-2-13b-chat","meta-llama/llama-guard-2-8b","meta-llama/llama-guard-3-8b",
    "meta-llama/llama-4-scout","meta-llama/llama-4-maverick",
  ],
  mistral: [
    "mistralai/mistral-large-2411","mistralai/mistral-large-2407","mistralai/mistral-large",
    "mistralai/mistral-medium","mistralai/mistral-small","mistralai/mistral-small-24b-instruct-2501",
    "mistralai/mistral-tiny","mistralai/mistral-7b-instruct","mistralai/mistral-7b-instruct-v0.3",
    "mistralai/mistral-nemo","mistralai/codestral-2501","mistralai/codestral-mamba","mistralai/ministral-3b","mistralai/ministral-8b",
    "mistralai/mixtral-8x7b-instruct","mistralai/mixtral-8x22b-instruct","mistralai/pixtral-12b","mistralai/pixtral-large-2411",
    "mistralai/mistral-saba",
  ],
  deepseek: [
    "deepseek/deepseek-chat","deepseek/deepseek-chat-v3.1","deepseek/deepseek-chat-v3.1:free",
    "deepseek/deepseek-r1","deepseek/deepseek-r1:free","deepseek/deepseek-r1-distill-llama-70b","deepseek/deepseek-r1-distill-llama-8b",
    "deepseek/deepseek-r1-distill-qwen-32b","deepseek/deepseek-r1-distill-qwen-14b","deepseek/deepseek-r1-distill-qwen-1.5b",
    "deepseek/deepseek-coder","deepseek/deepseek-v2-chat","deepseek/deepseek-prover-v2",
  ],
  xai: [
    "x-ai/grok-2-1212","x-ai/grok-2-vision-1212","x-ai/grok-beta","x-ai/grok-vision-beta","x-ai/grok-3","x-ai/grok-3-mini","x-ai/grok-4",
  ],
  cohere: [
    "cohere/command-r-plus","cohere/command-r-plus-08-2024","cohere/command-r","cohere/command-r-08-2024","cohere/command","cohere/command-r7b-12-2024",
  ],
  qwen: [
    "qwen/qwen-2.5-72b-instruct","qwen/qwen-2.5-7b-instruct","qwen/qwen-2.5-coder-32b-instruct","qwen/qwen-2-72b-instruct",
    "qwen/qwen-vl-plus","qwen/qwen-vl-max","qwen/qwen-2-vl-72b-instruct","qwen/qwen-2-vl-7b-instruct","qwen/qwq-32b-preview","qwen/qwen-max","qwen/qwen-plus","qwen/qwen-turbo","qwen/qwen3-235b-a22b","qwen/qwen3-32b","qwen/qwen3-coder",
  ],
  nvidia: [
    "nvidia/llama-3.1-nemotron-70b-instruct","nvidia/llama-3.1-nemotron-70b-instruct:free","nvidia/nemotron-4-340b-instruct","nvidia/llama-3.3-nemotron-super-49b-v1","nvidia/llama-3.1-nemotron-ultra-253b-v1",
  ],
  microsoft: [
    "microsoft/wizardlm-2-8x22b","microsoft/wizardlm-2-7b","microsoft/phi-3-mini-128k-instruct","microsoft/phi-3-medium-128k-instruct","microsoft/phi-3.5-mini-128k-instruct","microsoft/phi-4","microsoft/phi-4-multimodal-instruct","microsoft/mai-ds-r1",
  ],
  perplexity: [
    "perplexity/sonar","perplexity/sonar-pro","perplexity/sonar-reasoning","perplexity/sonar-reasoning-pro","perplexity/sonar-deep-research","perplexity/llama-3.1-sonar-small-128k-online","perplexity/llama-3.1-sonar-large-128k-online","perplexity/llama-3.1-sonar-huge-128k-online",
  ],
  amazon: [
    "amazon/nova-pro-v1","amazon/nova-lite-v1","amazon/nova-micro-v1",
  ],
  ai21: [
    "ai21/jamba-1-5-large","ai21/jamba-1-5-mini","ai21/jamba-instruct",
  ],
  databricks: ["databricks/dbrx-instruct"],
  inflection: ["inflection/inflection-3-pi","inflection/inflection-3-productivity"],
  liquid: ["liquid/lfm-40b","liquid/lfm-7b","liquid/lfm-3b"],
  nous: ["nousresearch/hermes-3-llama-3.1-405b","nousresearch/hermes-3-llama-3.1-70b","nousresearch/nous-hermes-2-mixtral-8x7b-dpo","nousresearch/deephermes-3-llama-3-8b-preview","nousresearch/deephermes-3-mistral-24b-preview"],
  thedrummer: ["thedrummer/rocinante-12b","thedrummer/unslopnemo-12b","thedrummer/anubis-pro-105b-v1","thedrummer/skyfall-36b-v2"],
  sao10k: ["sao10k/l3-euryale-70b","sao10k/l3-lunaris-8b","sao10k/l3.1-euryale-70b","sao10k/l3.3-euryale-70b"],
  gryphe: ["gryphe/mythomax-l2-13b","gryphe/mythomist-7b"],
  neversleep: ["neversleep/llama-3-lumimaid-70b","neversleep/llama-3-lumimaid-8b","neversleep/noromaid-20b"],
  openchat: ["openchat/openchat-7b","openchat/openchat-3.5-7b"],
  pygmalion: ["pygmalionai/mythalion-13b"],
  undi95: ["undi95/remm-slerp-l2-13b","undi95/toppy-m-7b"],
  reflection: ["mattshumer/reflection-70b"],
  zephyr: ["huggingfaceh4/zephyr-7b-beta"],
  alpindale: ["alpindale/goliath-120b","alpindale/magnum-72b"],
  anthracite: ["anthracite-org/magnum-v4-72b","anthracite-org/magnum-v2-72b"],
  cognitive: ["cognitivecomputations/dolphin-mixtral-8x22b","cognitivecomputations/dolphin-mixtral-8x7b","cognitivecomputations/dolphin3.0-mistral-24b","cognitivecomputations/dolphin3.0-r1-mistral-24b"],
  eleutherai: ["eleutherai/llemma_7b"],
  jondurbin: ["jondurbin/airoboros-l2-70b"],
  open_orca: ["open-orca/mistral-7b-openorca"],
  fireworks: ["accounts/fireworks/models/firefunction-v2"],
  arcee: ["arcee-ai/arcee-blitz","arcee-ai/coder-large","arcee-ai/maestro-reasoning","arcee-ai/spotlight","arcee-ai/virtuoso-large","arcee-ai/virtuoso-medium-v2"],
  shisa: ["shisa-ai/shisa-v2-llama3.3-70b"],
  rekaai: ["rekaai/reka-flash-3"],
  scb10x: ["scb10x/llama3.1-typhoon2-70b-instruct","scb10x/llama3.1-typhoon2-8b-instruct"],
  tngtech: ["tngtech/deepseek-r1t-chimera"],
  agentica: ["agentica-org/deepcoder-14b-preview"],
  allenai: ["allenai/molmo-7b-d","allenai/olmo-2-0325-32b-instruct","allenai/olmoe-1b-7b-0924-instruct"],
  inception: ["inception/mercury","inception/mercury-coder-small-beta"],
  moonshot: ["moonshotai/kimi-vl-a3b-thinking","moonshotai/moonlight-16b-a3b-instruct","moonshotai/kimi-k2"],
  z_ai: ["z-ai/glm-4.5","z-ai/glm-4.5-air","z-ai/glm-4.5v"],
  baichuan: ["baichuan/baichuan-m1-14b-instruct"],
  bytedance: ["bytedance/ui-tars-72b","bytedance/seed-oss-36b-instruct"],
  minimax: ["minimax/minimax-01","minimax/minimax-m1"],
  openrouter: ["openrouter/auto"],
} as const;

// Vision-capable model IDs (used when an image is sent)
export const VISION_MODELS = [
  "openai/gpt-4o","openai/gpt-4o-mini","openai/gpt-4o-2024-11-20",
  "anthropic/claude-3.5-sonnet","anthropic/claude-3.5-haiku","anthropic/claude-3-opus","anthropic/claude-3.7-sonnet",
  "x-ai/grok-2-vision-1212","x-ai/grok-vision-beta",
  "meta-llama/llama-3.2-90b-vision-instruct","meta-llama/llama-3.2-11b-vision-instruct",
  "qwen/qwen-2-vl-72b-instruct","qwen/qwen-vl-max","qwen/qwen-vl-plus",
  "mistralai/pixtral-large-2411","mistralai/pixtral-12b",
  "microsoft/phi-4-multimodal-instruct",
];

// Flat list (used for /model list and validation)
export const MODEL_CATALOG: string[] = Object.values(ALL_MODELS).flat() as string[];

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

/** Validate / normalize a /model command argument (case-insensitive prefix-match if needed) */
export function resolveModelId(input: string): string | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  // Exact match
  const exact = MODEL_CATALOG.find((m) => m.toLowerCase() === q);
  if (exact) return exact;
  // Suffix match (e.g. user types "claude-3.5-sonnet")
  const suffix = MODEL_CATALOG.find((m) => m.toLowerCase().endsWith("/" + q));
  if (suffix) return suffix;
  // Substring match — return first hit
  const sub = MODEL_CATALOG.find((m) => m.toLowerCase().includes(q));
  return sub || null;
}

/** Direct call to a specific OpenRouter model (text only) */
export async function callOpenRouterModel(
  model: string,
  userMessage: string,
  systemPrompt: string,
  maxTokens?: number,
): Promise<string | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;
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
      console.error(`callOpenRouterModel ${model}:`, r.status);
      return null;
    }
    const d = await r.json();
    return d?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error(`callOpenRouterModel ${model} ex:`, e);
    return null;
  }
}

/** Vision: send image + question. imageUrl can be data URL or https URL */
export async function visionAsk(
  imageUrl: string,
  question: string,
  systemPrompt: string,
  preferredModel?: string,
): Promise<{ text: string; model: string } | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;
  const candidates = preferredModel ? [preferredModel, ...VISION_MODELS] : VISION_MODELS;
  for (const model of candidates) {
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
            {
              role: "user",
              content: [
                { type: "text", text: question || "Is image me kya dikh raha hai? Detail me batao Hinglish me." },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          max_tokens: 800,
        }),
      });
      if (!r.ok) { console.error(`vision ${model}:`, r.status); continue; }
      const d = await r.json();
      const txt = d?.choices?.[0]?.message?.content;
      if (txt) return { text: typeof txt === "string" ? txt : JSON.stringify(txt), model };
    } catch (e) { console.error(`vision ${model} ex:`, e); }
  }
  return null;
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
  forcedModel?: string,
): Promise<{ text: string; model: string } | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;

  const task = taskOverride || detectTask(userMessage);
  const models = forcedModel ? [forcedModel, ...MODELS[task]] : MODELS[task];

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
