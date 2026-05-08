// User-created bot webhook — handles all custom Zara-clone bots
// URL pattern: /functions/v1/user-bot-webhook/<BOT_TOKEN>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

async function getAIReply(userMessage: string, systemPrompt: string, maxTokens = 200): Promise<string> {
  // 1) OpenRouter smart router (DeepSeek/Claude/GPT/Llama/Mistral/Grok — no Gemini)
  try {
    const { routeOpenRouter } = await import("../_shared/openrouter.ts");
    const or = await routeOpenRouter(userMessage, systemPrompt, maxTokens, undefined, (globalThis as any).__zaraForcedModel);
    if (or?.text) {
      console.log(`[Clone Bot] OpenRouter model: ${or.model}`);
      (globalThis as any).__zaraLastModel = or.model;
      return or.text;
    }
  } catch (e) { console.error("OpenRouter fail:", e); }

  // 2) Groq fallback
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
        if (txt) { (globalThis as any).__zaraLastModel = "groq/llama-3.3-70b-versatile"; return txt; }
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
        if (txt) { (globalThis as any).__zaraLastModel = "google/gemini-2.5-flash"; return txt; }
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
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat.id;
    const telegramUserId: number | undefined = message.from?.id;
    const userText = (message.text || "").trim();
    const lowerText = userText.toLowerCase();
    const firstName = message.from?.first_name || "Jaan";
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";

    // ===== PHOTO → vision describe =====
    if (message.photo && message.photo.length > 0) {
      try {
        const caption = (message.caption || "").trim();
        const photoObj = message.photo[message.photo.length - 1];
        const fileResp = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoObj.file_id}`);
        const fileData = await fileResp.json();
        const filePath = fileData.result?.file_path;
        if (filePath) {
          const photoResp = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const photoBuffer = await photoResp.arrayBuffer();
          const photoBase64 = btoa(String.fromCharCode(...new Uint8Array(photoBuffer)));
          const dataUrl = `data:image/jpeg;base64,${photoBase64}`;
          const { visionAsk } = await import("../_shared/openrouter.ts");
          let forced: string | undefined;
          if (telegramUserId) {
            const { data: mrow } = await supabase.from("zara_user_model").select("model").eq("telegram_user_id", telegramUserId).maybeSingle();
            if (mrow?.model) forced = mrow.model;
          }
          const v = await visionAsk(dataUrl, caption, `You are ${botName}, sweet Hinglish AI. Describe / answer about user's image, 2-4 lines, light emojis.`, forced);
          if (v?.text) {
            await sendMessage(botToken, chatId, `${v.text}\n\n_(via ${v.model})_`);
            return new Response("OK", { status: 200 });
          }
        }
        await sendMessage(botToken, chatId, `Image dekh nahi paayi 😅 try again ${firstName}!`);
      } catch (e) { console.error("clone vision err:", e); }
      return new Response("OK", { status: 200 });
    }

    if (!message.text) return new Response("OK", { status: 200 });

    // Forced-model lookup for this user
    try {
      (globalThis as any).__zaraForcedModel = undefined;
      if (telegramUserId) {
        const { data: mrow } = await supabase.from("zara_user_model").select("model").eq("telegram_user_id", telegramUserId).maybeSingle();
        if (mrow?.model) (globalThis as any).__zaraForcedModel = mrow.model;
      }
    } catch (_) {}

    // /model command
    if (lowerText.startsWith("/model")) {
      const arg = userText.slice(6).trim();
      const { resolveModelId, MODEL_CATALOG } = await import("../_shared/openrouter.ts");
      if (!arg || arg.toLowerCase() === "list") {
        await sendMessage(botToken, chatId, `🤖 ${MODEL_CATALOG.length}+ OpenRouter models available!\n\n• /model <name> — set\n• /model auto — reset\n• /model status — show current\n• /model search <query> — find\n\nExamples: \`/model gpt-4o\`, \`/model deepseek-r1\`, \`/model claude-3.5-sonnet\``);
        return new Response("OK", { status: 200 });
      }
      if (["auto", "reset"].includes(arg.toLowerCase())) {
        if (telegramUserId) await supabase.from("zara_user_model").delete().eq("telegram_user_id", telegramUserId);
        await sendMessage(botToken, chatId, `✅ Auto-routing on, ${firstName}! 🤖`);
        return new Response("OK", { status: 200 });
      }
      if (arg.toLowerCase() === "status") {
        const cur = (globalThis as any).__zaraForcedModel;
        await sendMessage(botToken, chatId, cur ? `🎯 Current: \`${cur}\`` : `🤖 Auto-routing`);
        return new Response("OK", { status: 200 });
      }
      if (arg.toLowerCase().startsWith("search ")) {
        const q = arg.slice(7).toLowerCase();
        const hits = MODEL_CATALOG.filter((m) => m.toLowerCase().includes(q)).slice(0, 25);
        await sendMessage(botToken, chatId, hits.length ? `🔎 *${q}:*\n${hits.map((m) => "• `" + m + "`").join("\n")}` : `❌ No match`);
        return new Response("OK", { status: 200 });
      }
      const resolved = resolveModelId(arg);
      if (!resolved) { await sendMessage(botToken, chatId, `❌ "${arg}" not found. Try \`/model search ${arg}\``); return new Response("OK", { status: 200 }); }
      if (telegramUserId) await supabase.from("zara_user_model").upsert({ telegram_user_id: telegramUserId, chat_id: chatId, bot_token: "", model: resolved, scope: "user", updated_at: new Date().toISOString() }, { onConflict: "telegram_user_id,chat_id,bot_token" } as any);
      await sendMessage(botToken, chatId, `🎯 Model set: \`${resolved}\` 💖`);
      return new Response("OK", { status: 200 });
    }

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

    // ===== 🛡️ GROUP MODERATION (abuse/spam/scam/flood + 3-strike) =====
    if (isGroup && message.message_id && message.from?.id) {
      try {
        const { moderateGroupMessage } = await import("../_shared/moderation.ts");
        const moderated = await moderateGroupMessage({
          supabase, botToken, chatId,
          msgId: message.message_id, userId: message.from.id, firstName,
          username: message.from.username, text: userText,
          groqKey: GROQ_API_KEY, lovableKey: LOVABLE_API_KEY, strict: true, replyToMessage: message.reply_to_message,
        });
        if (moderated) return new Response("OK", { status: 200 });
      } catch (e) { console.error("clone bot moderation error:", e); }
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
    (globalThis as any).__zaraLastModel = undefined;
    const reply = await getAIReply(userText, systemPrompt, 200);
    const usedModel = (globalThis as any).__zaraLastModel as string | undefined;
    const watermark = usedModel ? `🤖 _via ${usedModel}_\n\n` : "";
    await sendMessage(botToken, chatId, watermark + reply);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("user-bot-webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
