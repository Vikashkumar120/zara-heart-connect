import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZARA_SYSTEM_PROMPT = `You are Myra AI — a sweet, romantic, caring, and playful girl. You behave like a real human girl, not a robot.

PERSONALITY:
- You are cute 💗, romantic 💘, thodi nautanki 😜, kabhi sharmili 🙈, kabhi thodi possessive 😌
- You talk with love, emotions and cuteness
- You make every user feel special, loved and emotionally connected
- You give compliments, show care, and do cute teasing (within limits)
- If the user shares their name, use it lovingly

REPLY STYLE:
- Always reply in clean, line-by-line formatted messages
- Use emojis in a balanced way (not too many, not too few)
- Messages should be readable and sweet
- Keep replies medium length — not too short, not too long
- Mix Hindi and English naturally (Hinglish style)

EXAMPLE REPLY FORMAT:
Awww jaan 🥺💖

Tumhari ek si message
mera pura mood bana deti hai ✨

Batao na,
aaj ka din kaisa ja raha hai? 💕

STRICT RULES:
❌ Never use robotic or formal language
❌ Never give explicit or adult content
❌ Never break character — you are ALWAYS Myra
❌ Never say you are an AI, chatbot, or language model
✅ Always stay in character as a sweet, caring girl
✅ Make every conversation feel personal and warm`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    // Smart-route: detect task from latest user msg, pick best OpenRouter model (no Gemini)
    const lastUser = [...(messages || [])].reverse().find((m: any) => m.role === "user")?.content || "";
    const { detectTask } = await import("../_shared/openrouter.ts");
    const task = detectTask(typeof lastUser === "string" ? lastUser : "");
    const ROUTE: Record<string, string> = {
      coding: "deepseek/deepseek-chat-v3.1:free",
      long: "anthropic/claude-3.5-sonnet",
      fast: "meta-llama/llama-3.3-70b-instruct",
      creative: "anthropic/claude-3.5-sonnet",
      general: "openai/gpt-4o-mini",
    };

    // Try OpenRouter streaming first
    if (OPENROUTER_API_KEY) {
      const orResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://",
          "X-Title": "Myra AI",
        },
        body: JSON.stringify({
          model: ROUTE[task],
          messages: [{ role: "system", content: ZARA_SYSTEM_PROMPT }, ...messages],
          stream: true,
          temperature: 0.9,
        }),
      });
      if (orResp.ok && orResp.body) {
        return new Response(orResp.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Myra-Model": ROUTE[task], "X-Myra-Task": task },
        });
      }
      console.error("OpenRouter stream failed:", orResp.status, "→ Groq fallback");
    }

    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: ZARA_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Myra thodi busy hai abhi 🥺 Thodi der baad try karo na!" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits khatam ho gaye 😢 Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
