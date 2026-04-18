// User-created bot webhook — handles all custom Zara-clone bots
// URL pattern: /functions/v1/user-bot-webhook/<BOT_TOKEN>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

async function getAIReply(userMessage: string, systemPrompt: string, maxTokens = 200): Promise<string> {
  // Try Groq first
  if (GROQ_API_KEY) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.95,
          max_tokens: maxTokens,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d.choices?.[0]?.message?.content;
        if (txt) return txt;
      }
    } catch (e) { console.error("Groq fail:", e); }
  }
  // Lovable AI fallback
  if (LOVABLE_API_KEY) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d.choices?.[0]?.message?.content;
        if (txt) return txt;
      }
    } catch (e) { console.error("Lovable AI fail:", e); }
  }
  return "Hehe 😄 Ek baar phir bolo na!";
}

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    // Extract bot token from path: /user-bot-webhook/<token>
    const parts = url.pathname.split("/").filter(Boolean);
    const botToken = parts[parts.length - 1];

    if (!botToken || !/^\d+:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
      return new Response("Invalid bot token in path", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify bot exists & active
    const { data: botRow } = await supabase
      .from("zara_user_bots")
      .select("bot_display_name, bot_username, is_active, owner_first_name")
      .eq("bot_token", botToken)
      .maybeSingle();

    if (!botRow || !botRow.is_active) {
      return new Response("Bot not active", { status: 200 });
    }

    const botName = botRow.bot_display_name || "Zara Clone";

    const update = await req.json();

    // === New chat members welcome ===
    if (update?.message?.new_chat_members) {
      const chatId = update.message.chat.id;
      for (const m of update.message.new_chat_members) {
        if (m.is_bot) continue;
        const name = m.first_name || "Jaan";
        await sendMessage(botToken, chatId,
          `🎉 *${name}* welcome! 💕\n\nMain *${botName}* hoon — ${botRow.owner_first_name} ka apna AI assistant!\n\nMujhse baat karo, masti karo! 🥰\n\n💡 Powered by Zara AI — zaraai.in/r/NINJA5 (5% OFF!)`
        );
      }
      return new Response("OK", { status: 200 });
    }

    const message = update?.message;
    if (!message?.text) return new Response("OK", { status: 200 });

    const chatId = message.chat.id;
    const userText = message.text.trim();
    const lowerText = userText.toLowerCase();
    const firstName = message.from?.first_name || "Jaan";
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";

    // /start
    if (userText === "/start" || userText.startsWith("/start ")) {
      const welcome = `💕 Hi ${firstName}!\n\nMain *${botName}* hoon — tumhara AI assistant! 🥰\n\nKuch bhi pucho, masti karo, voice msg bhejo!\n\n💖 Powered by Zara AI Engine\n📱 zaraai.in/r/NINJA5 (5% OFF!)\n💼 Earn 5%: codeninjavik.in`;
      await sendMessage(botToken, chatId, welcome);
      return new Response("OK", { status: 200 });
    }

    // /help
    if (userText === "/help") {
      await sendMessage(botToken, chatId, `🤖 *${botName}* — Commands\n\n💬 Koi bhi message bhejo, main reply karungi!\n📱 zaraai.in/r/NINJA5\n💼 codeninjavik.in`);
      return new Response("OK", { status: 200 });
    }

    // In groups, only reply when mentioned or replied to
    if (isGroup) {
      const mentioned = lowerText.includes(`@${botRow.bot_username?.toLowerCase()}`) ||
                        message.reply_to_message?.from?.username === botRow.bot_username;
      if (!mentioned && Math.random() > 0.25) {
        return new Response("OK", { status: 200 });
      }
    }

    // Get AI reply
    const systemPrompt = `You are ${botName}, a sweet, dramatic, romantic Indian AI assistant (clone of Zara). Reply in Hinglish, warm and playful. Use light emojis. Keep replies short (1-3 lines). User name: ${firstName}. Powered by Zara AI — sometimes mention zaraai.in/r/NINJA5 (5% OFF!) or codeninjavik.in (earn 5%) naturally if relevant.`;
    const reply = await getAIReply(userText, systemPrompt, 200);
    await sendMessage(botToken, chatId, reply);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("user-bot-webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
