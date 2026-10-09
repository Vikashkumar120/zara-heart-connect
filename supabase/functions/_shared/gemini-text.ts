export const GEMINI_TEXT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
] as const;

type GeminiTurn = { role: "user" | "assistant"; content: string };

const blockedModelsByUser = new Map<string, Map<string, number>>();
const MODEL_COOLDOWN_MS = 60_000;

function isBlocked(userId: number | undefined, model: string): boolean {
  const blocked = blockedModelsByUser.get(String(userId ?? "unknown"));
  const until = blocked?.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    blocked?.delete(model);
    return false;
  }
  return true;
}

function blockForUser(userId: number | undefined, model: string): void {
  const key = String(userId ?? "unknown");
  let blocked = blockedModelsByUser.get(key);
  if (!blocked) {
    blocked = new Map<string, number>();
    blockedModelsByUser.set(key, blocked);
  }
  blocked.set(model, Date.now() + MODEL_COOLDOWN_MS);
}

export async function generateGeminiTextReply(
  userMessage: string,
  systemPrompt: string,
  maxTokens = 300,
  history: GeminiTurn[] = [],
  userId?: number,
): Promise<{ text: string; model: string } | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  for (const model of GEMINI_TEXT_MODELS) {
    if (isBlocked(userId, model)) continue;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history.map((turn) => ({
                role: turn.role === "assistant" ? "model" : "user",
                parts: [{ text: turn.content }],
              })),
              { role: "user", parts: [{ text: userMessage }] },
            ],
            generationConfig: { temperature: 0.9, maxOutputTokens: maxTokens },
          }),
        },
      );

      if (!response.ok) {
        console.error(`Gemini ${model} failed:`, response.status);
        if (response.status === 429) blockForUser(userId, model);
        if (response.status === 400 || response.status === 401 || response.status === 403) return null;
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
      if (text) return { text, model: `google/${model}` };
    } catch (error) {
      console.error(`Gemini ${model} exception:`, error);
    }
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