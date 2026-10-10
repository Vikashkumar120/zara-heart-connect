export const GROQ_KEY_ENV_NAMES = [
  "GROQ_API_KEY",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_7",
  "GROQ_API_KEY_8",
  "GROQ_API_KEY_9",
  "GROQ_API_KEY_10",
] as const;

type GroqTurn = { role: "user" | "assistant"; content: string };
type GroqEnvironment = (name: string) => string | undefined;
type GroqFetch = typeof fetch;

type GroqDependencies = {
  env?: GroqEnvironment;
  fetcher?: GroqFetch;
  sleep?: (milliseconds: number) => Promise<void>;
};

const MODEL = "llama-3.3-70b-versatile";
const QUOTA_COOLDOWN_MS = 60_000;
const INVALID_KEY_COOLDOWN_MS = 30 * 60_000;
const blockedKeysUntil = new Map<string, number>();
const nextKeyByUser = new Map<string, number>();

function retryDelay(response: Response, fallbackMs: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 10_000);
  }
  return fallbackMs;
}

export async function generateGroqTextReply(
  userMessage: string,
  systemPrompt: string,
  maxTokens = 300,
  history: GroqTurn[] = [],
  userId?: number,
  primaryKey?: string,
  dependencies: GroqDependencies = {},
): Promise<{ text: string; model: string } | null> {
  const env = dependencies.env ?? ((name: string) => Deno.env.get(name));
  const fetcher = dependencies.fetcher ?? fetch;
  const sleep = dependencies.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const keys = GROQ_KEY_ENV_NAMES.map((name, index) => ({
    name,
    value: (index === 0 ? primaryKey : undefined) || env(name) || "",
  })).filter((entry) => entry.value.length > 0);

  if (keys.length === 0) return null;

  const distinctKeys = keys.filter((entry, index) => keys.findIndex((candidate) => candidate.value === entry.value) === index);
  const userKey = String(userId ?? "unknown");
  const startAt = (nextKeyByUser.get(userKey) ?? 0) % distinctKeys.length;
  let serverFailureAttempts = 0;

  for (let offset = 0; offset < distinctKeys.length; offset += 1) {
    const keyIndex = (startAt + offset) % distinctKeys.length;
    const entry = distinctKeys[keyIndex];
    const blockedUntil = blockedKeysUntil.get(entry.name) ?? 0;
    if (blockedUntil > Date.now()) continue;
    if (blockedUntil) blockedKeysUntil.delete(entry.name);

    let response: Response;
    try {
      response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${entry.value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage },
          ],
          temperature: 0.95,
          max_tokens: maxTokens,
        }),
      });
    } catch {
      serverFailureAttempts += 1;
      if (serverFailureAttempts >= 3) return null;
      await sleep(500 * serverFailureAttempts);
      continue;
    }

    if (response.ok) {
      try {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (typeof text === "string" && text.trim()) {
          nextKeyByUser.set(userKey, keyIndex);
          return { text: text.trim(), model: `groq/${MODEL}` };
        }
      } catch {
        return null;
      }
      return null;
    }

    if (response.status === 429 || response.status === 402) {
      blockedKeysUntil.set(entry.name, Date.now() + retryDelay(response, QUOTA_COOLDOWN_MS));
      nextKeyByUser.set(userKey, (keyIndex + 1) % distinctKeys.length);
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      blockedKeysUntil.set(entry.name, Date.now() + INVALID_KEY_COOLDOWN_MS);
      nextKeyByUser.set(userKey, (keyIndex + 1) % distinctKeys.length);
      continue;
    }

    if (response.status >= 500) {
      serverFailureAttempts += 1;
      if (serverFailureAttempts >= 3) return null;
      await sleep(retryDelay(response, 500 * serverFailureAttempts));
      continue;
    }

    return null;
  }

  return null;
}

export function temporaryReplyUnavailable(name = "jaan"): string {
  const replies = [
    `${name}, abhi mera reply likhne mein technical dikkat aa rahi hai 😔 thodi der baad phir message karna, main yahin hoon 💕`,
    `Tumhara message mil gaya ${name} 💕 filhaal reply service mein rukawat hai—thodi der baad dobara try karna.`,
    `${name}, main abhi sahi jawab nahi de pa rahi kyunki reply service temporarily unavailable hai. Thodi der baad try karna 💗`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}