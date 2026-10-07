// User-created bot webhook — handles all custom Myra-clone bots
// URL pattern: /functions/v1/user-bot-webhook/<BOT_TOKEN>
import { buildReplyStyle, finishSentence, humanizeText, sendHumanBubbles, welcomeLine } from "../_shared/human-reply.ts";
import { runGroupAdmin, handleServiceMessage, recordBotMessage } from "../_shared/group-admin.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { detectSupportIntent, supportMessage, detectMyraCommercialIntent, myraCommercialReply, maybeAnnouncement, detectReferralIntent, referralMessage, detectDeveloperIntent, developerMessage } from "../_shared/support.ts";
import { sendGeminiTelegramVoice } from "../_shared/gemini-voice.ts";
import { routeOpenRouter, visionAsk, resolveModelId, MODEL_CATALOG } from "../_shared/openrouter.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

// ===== DE-DUPLICATION & PER-USER FAILOVER STATE =====
const processedUpdateIds = new Map<number, number>();
function markUpdateProcessed(updateId: number): boolean {
  const now = Date.now();
  if (processedUpdateIds.size > 500) {
    for (const [k, t] of processedUpdateIds) if (now - t > 10 * 60_000) processedUpdateIds.delete(k);
  }
  if (processedUpdateIds.has(updateId)) return false;
  processedUpdateIds.set(updateId, now);
  return true;
}
const lastReplyByUser = new Map<string, { text: string; ts: number }>();
function shouldSkipDuplicateReply(userId: number, chatId: number, text: string): boolean {
  const key = `${userId}:${chatId}`;
  const now = Date.now();
  const prev = lastReplyByUser.get(key);
  if (prev && prev.text === text && now - prev.ts < 60_000) return true;
  lastReplyByUser.set(key, { text, ts: now });
  return false;
}
const userBlockedModels = new Map<number, Map<string, number>>();
function blockModelForUser(userId: number | undefined, model: string) {
  if (!userId) return;
  let m = userBlockedModels.get(userId);
  if (!m) { m = new Map(); userBlockedModels.set(userId, m); }
  m.set(model, Date.now() + 5 * 60_000);
}
function isModelBlocked(userId: number | undefined, model: string): boolean {
  if (!userId) return false;
  const m = userBlockedModels.get(userId);
  if (!m) return false;
  const exp = m.get(model);
  if (!exp) return false;
  if (Date.now() > exp) { m.delete(model); return false; }
  return true;
}

function normalizeReplyText(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEchoLikeReply(reply: string, userText: string): boolean {
  const answer = normalizeReplyText(reply);
  const input = normalizeReplyText(userText);
  if (!answer || !input || answer === input) return true;
  if (input.split(" ").length >= 4 && answer.length <= 120 && (answer.includes(input) || input.includes(answer))) return true;
  const inputWords = new Set(input.split(" ").filter((word) => word.length > 2));
  const answerWords = answer.split(" ").filter((word) => word.length > 2);
  if (inputWords.size >= 3 && answerWords.length > 0) {
    const overlap = answerWords.filter((word) => inputWords.has(word)).length / answerWords.length;
    return overlap >= 0.85 && answerWords.length <= inputWords.size + 2;
  }
  return false;
}

async function getAIReply(userMessage: string, systemPrompt: string, maxTokens = 200): Promise<string> {
  // 1) OpenRouter smart router (DeepSeek/Claude/GPT/Llama/Mistral/Grok — no Gemini)
  try {
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
    const chain = [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "google/gemini-2.5-pro",
    ];
    const currentUserId = (globalThis as any).__zaraCurrentUserId as number | undefined;
    for (const model of chain) {
      if (isModelBlocked(currentUserId, model)) { console.log(`Skipping blocked ${model} for user`); continue; }
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: Math.max(maxTokens, 400),
          }),
        });
        if (r.status === 429 || r.status === 402) { console.error(`Lovable ${model} limit`); blockModelForUser(currentUserId, model); continue; }
        if (!r.ok) { console.error(`Lovable ${model}:`, r.status); continue; }
        const d = await r.json();
        const txt = d.choices?.[0]?.message?.content;
        if (txt && txt.trim()) { (globalThis as any).__zaraLastModel = model; return txt; }
      } catch (e) { console.error(`Lovable ${model} ex:`, e); }
    }
  }
  return "Ek sec ruko jaan 😅 sab models thode busy hain — dobara try karo!";
}


function isLikelyImageGenerationRequest(text: string): boolean {
  const t = (text || "").toLowerCase().trim();
  if (!t || t.startsWith("/")) return false;

  const imageWords = /(image|images|photo|photos|picture|pictures|pic|pics|tasveer|tasvir|tashveer|drawing|art|artwork|wallpaper|poster|logo|banner|thumbnail|sketch|painting|illustration|avatar|sticker|dp|profile pic|cover photo|cinematic shot|portrait|landscape|render|3d render|scene)/i;
  const makeWords = /(banao|bana do|bana de|banado|banade|bnao|bna do|bna de|generate|create|make|draw|design|render|imagine|paint|sketch|taiyar karo|create karo|design karo)/i;
  const styleWords = /(photorealistic|realistic|hyper realistic|anime|cartoon|cyberpunk|cinematic|ultra detailed|4k|8k|studio lighting|oil painting|watercolor|digital art|pixel art|concept art|mockup|vector|minimal logo)/i;
  const promptOpeners = /^(imagine|draw|create|generate|make|design|render|paint|sketch)\b/i;
  const hindiPromptOpeners = /^(ek|aik|mujhe|mere liye|mereko|zara)\b.*\b(banao|bana do|bana de|banado|bnao|bna do|generate karo|create karo|design karo)\b/i;
  const assetTarget = /\b(logo|poster|banner|thumbnail|wallpaper|dp|avatar|sticker|profile pic|cover photo)\b/i;
  const looksLikeStandalonePrompt = /^(a|an|ek|aik)\s+.{20,}/i.test(t) &&
    /\b(with|wearing|standing|sitting|holding|background|style|lighting|camera|portrait|scene|cinematic|realistic|beautiful|cute|girl|boy|man|woman|car|room|city|forest|mountain|beach|sky)\b/i.test(t) &&
    !/[?？]$/.test(t);

  return (makeWords.test(t) && (imageWords.test(t) || styleWords.test(t) || assetTarget.test(t))) ||
    (promptOpeners.test(t) && (imageWords.test(t) || styleWords.test(t) || t.length > 20)) ||
    hindiPromptOpeners.test(t) ||
    looksLikeStandalonePrompt ||
    /^\s*(image|photo|picture|tasveer|poster|logo|wallpaper)\s*[:=-]/i.test(t);
}

function cleanImagePrompt(text: string): string {
  const stripped = (text || "")
    .replace(/^\s*(zara|please|pls|mujhe|mereko|mere liye|yaar|jaan)[, ]+/i, "")
    .replace(/\b(please|pls|na|yaar|jaan)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 4 ? stripped : text.trim();
}

function startChatAction(token: string, chatId: number, action = "typing"): () => void {
  let stopped = false;
  sendChatAction(token, chatId, action).catch(() => {});
  const timer = setInterval(() => {
    if (stopped) return;
    sendChatAction(token, chatId, action).catch(() => {});
  }, 4000);
  return () => { if (stopped) return; stopped = true; clearInterval(timer); };
}

async function sendChatAction(token: string, chatId: number, action: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

async function sendPhotoFromBase64(botToken: string, chatId: number, dataUrl: string, caption: string): Promise<boolean> {
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const imageBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) imageBytes[i] = binaryStr.charCodeAt(i);

    const encoder = new TextEncoder();
    const boundary = "----MyraCloneImg" + Date.now();
    const chatIdPart = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
    const captionPart = `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="zara_art.png"\r\nContent-Type: image/png\r\n\r\n`;
    const endPart = `\r\n--${boundary}--\r\n`;

    const chatIdBytes = encoder.encode(chatIdPart);
    const captionBytes = encoder.encode(captionPart);
    const filePartBytes = encoder.encode(filePart);
    const endPartBytes = encoder.encode(endPart);
    const body = new Uint8Array(chatIdBytes.length + captionBytes.length + filePartBytes.length + imageBytes.length + endPartBytes.length);
    let offset = 0;
    body.set(chatIdBytes, offset); offset += chatIdBytes.length;
    body.set(captionBytes, offset); offset += captionBytes.length;
    body.set(filePartBytes, offset); offset += filePartBytes.length;
    body.set(imageBytes, offset); offset += imageBytes.length;
    body.set(endPartBytes, offset);

    const sendResult = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    if (!sendResult.ok) console.error("clone sendPhoto failed:", sendResult.status, await sendResult.text());
    return sendResult.ok;
  } catch (e) {
    console.error("clone sendPhotoFromBase64 error:", e);
    return false;
  }
}

async function generateAndSendImage(botToken: string, chatId: number, prompt: string, firstName: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY") || LOVABLE_API_KEY;
  if (!apiKey) {
    await sendMessage(botToken, chatId, `😅 Image generation setup nahi hai ${firstName}!`);
    return;
  }

  await sendChatAction(botToken, chatId, "upload_photo");
  await sendMessage(botToken, chatId, `🎨 ${firstName}, image bana rahi hoon... thoda wait karo! ✨`);

  try {
    const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Generate a high quality image from this exact prompt: ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });

    if (!imgResponse.ok) {
      console.error("clone image API error:", imgResponse.status, await imgResponse.text());
      await sendMessage(botToken, chatId, `😅 Image nahi ban payi ${firstName}! Prompt change karke try karo 🎨`);
      return;
    }

    const imgData = await imgResponse.json();
    const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (imageUrl) {
      const sent = await sendPhotoFromBase64(botToken, chatId, imageUrl, `🎨 ${prompt}\n\n✨ Generated by Myra AI 💕`);
      if (!sent) await sendMessage(botToken, chatId, `😅 Telegram pe image send nahi ho payi ${firstName}, dobara try karo 🎨`);
    } else {
      await sendMessage(botToken, chatId, `😅 Image generate nahi ho payi ${firstName}! Alag prompt try karo 🎨`);
    }
  } catch (e) {
    console.error("clone image gen error:", e);
    await sendMessage(botToken, chatId, `😅 Image generate nahi ho payi ${firstName}! Dobara try karo 🎨`);
  }
}

async function sendMessage(token: string, chatId: number, text: string, replyTo?: number) {
  const replyParams = replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {};
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...replyParams }),
  });
  if (r.ok && chatId < 0) {
    r.clone().json().then((d) => recordBotMessage(token, chatId, d?.result?.message_id)).catch(() => {});
  }
  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    console.error("clone sendMessage failed, retrying plain:", r.status, errBody.slice(0, 200));
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, ...replyParams }),
    }).catch((e) => console.error("clone plain sendMessage failed:", e));
  }
}

async function cloneSocialDownload(token: string, chatId: number, url: string, fmt: string) {
  const { resolveDownload } = await import("../_shared/downloader.ts");
  const isAudio = fmt === "mp3";
  const label = isAudio ? "MP3" : fmt === "max" ? "4K/Max" : `${fmt}p`;
  await sendMessage(token, chatId, `⏳ ${label} me download kar rahi hoon... thoda ruko 💕`);

  const res = await resolveDownload(url, fmt as any);
  if (!res.ok || !res.url) {
    await sendMessage(token, chatId, "😢 Ye link download nahi ho paaya — private ho sakta hai ya server busy hai, baad me try karo 💕");
    return;
  }
  const items = res.items?.length ? res.items.slice(0, 10) : [res.url];
  let sentAny = false;
  for (const item of items) {
    const method = isAudio ? "sendAudio" : res.kind === "photo" ? "sendPhoto" : "sendVideo";
    const field = isAudio ? "audio" : res.kind === "photo" ? "photo" : "video";
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, [field]: item, caption: `✨ Ye lo — ${label} 💖`, supports_streaming: true }),
    });
    if (r.ok) sentAny = true;
  }
  if (!sentAny) {
    await sendMessage(token, chatId, `😅 File badi hai, upload nahi ho paayi.\n\n👇 Direct link:\n${res.url}`);
  }
}

async function sendButtons(
  token: string,
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } }),
  }).catch((e) => console.error("clone sendButtons failed:", e));
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

    const botName = botRow.bot_display_name || "Myra Clone";

    const update = await req.json();

    if (typeof update?.update_id === "number" && !markUpdateProcessed(update.update_id)) {
      console.log("clone bot: duplicate update_id, skip", update.update_id);
      return new Response("OK", { status: 200 });
    }

    // === Social downloader: quality button callbacks ===
    if (update?.callback_query?.data?.startsWith("dl|")) {
      const cq = update.callback_query;
      const [, fmt, linkId] = String(cq.data).split("|");
      const cbChatId = cq.message?.chat?.id;
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cq.id, text: "Download shuru... 💕" }),
      }).catch(() => {});
      if (cbChatId) {
        const { data: row } = await supabase.from("zara_dl_links").select("url").eq("id", linkId).maybeSingle();
        if (!row?.url) {
          await sendMessage(botToken, cbChatId, "😅 Link purana ho gaya, dobara bhejo na 💕");
        } else {
          await cloneSocialDownload(botToken, cbChatId, row.url, fmt);
        }
      }
      return new Response("OK", { status: 200 });
    }

    // === New chat members welcome ===
    if (update?.message?.new_chat_members) {
      try { await handleServiceMessage({ supabase, botToken, message: update.message }); } catch (e) { console.error("service msg error:", e); }
      const chatId = update.message.chat.id;
      for (const m of update.message.new_chat_members) {
        if (m.is_bot) continue;
        const name = m.first_name || "Jaan";
        await sendMessage(botToken, chatId, welcomeLine(name));
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
    (globalThis as any).__zaraCurrentUserId = telegramUserId;

    // ===== 🛠 GROUP ADMIN TOOLKIT (commands + filters) =====
    if (isGroup) {
      try {
        if (await runGroupAdmin({ supabase, botToken, message })) return new Response("OK", { status: 200 });
      } catch (e) { console.error("clone group admin error:", e); }
    }

    if (!userText.startsWith("/") && detectDeveloperIntent(userText)) {
      const dev = developerMessage(firstName);
      await sendButtons(botToken, chatId, dev.text, dev.buttons as any);
      return new Response("OK", { status: 200 });
    }

    if (lowerText.startsWith("/referral") || (!userText.startsWith("/") && detectReferralIntent(userText))) {
      const ref = referralMessage(firstName);
      await sendButtons(botToken, chatId, ref.text, ref.buttons as any);
      return new Response("OK", { status: 200 });
    }

    const commercialIntent = detectMyraCommercialIntent(userText);
    if (commercialIntent) {
      const commercialReply = myraCommercialReply(commercialIntent, firstName);
      await sendMessage(botToken, chatId, commercialReply);
      await sendGeminiTelegramVoice(botToken, chatId, commercialReply, "Aoede", telegramUserId);
      return new Response("OK", { status: 200 });
    }

    // ===== LIMIT ERROR HELP — works for text and image captions =====
    const limitText = (message.text || message.caption || "").trim();
    const limitIntent = detectSupportIntent(limitText);
    if (limitIntent === "limit") {
      const { text: limitReply, buttons: limitButtons } = supportMessage("limit", firstName);
      await sendButtons(botToken, chatId, limitReply, limitButtons as any);
      return new Response("OK", { status: 200 });
    }

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
          let forced: string | undefined;
          if (telegramUserId) {
            const { data: mrow } = await supabase.from("zara_user_model").select("model").eq("telegram_user_id", telegramUserId).maybeSingle();
            if (mrow?.model) forced = mrow.model;
          }
          const v = await visionAsk(dataUrl, caption, `You are ${botName}, sweet Hinglish AI. Describe / answer about user's image, 2-4 lines, light emojis. If the image is a screenshot showing a quota, rate-limit, daily-limit, resource-exhausted, or "limit reached" error, clearly mention that it is a limit error.`, forced);
          if (v?.text) {
            if (detectSupportIntent(v.text) === "limit") {
              const { text: limitReply, buttons: limitButtons } = supportMessage("limit", firstName);
              await sendButtons(botToken, chatId, limitReply, limitButtons as any);
              return new Response("OK", { status: 200 });
            }
            await sendMessage(botToken, chatId, `${v.text}\n\n_(via ${v.model})_`);
            await sendGeminiTelegramVoice(botToken, chatId, v.text, "Aoede", telegramUserId);
            return new Response("OK", { status: 200 });
          }
        }
        await sendMessage(botToken, chatId, `Image dekh nahi paayi 😅 try again ${firstName}!`);
      } catch (e) { console.error("clone vision err:", e); }
      return new Response("OK", { status: 200 });
    }

    if (!message.text) return new Response("OK", { status: 200 });

    if (userText.length < 900 && isLikelyImageGenerationRequest(userText)) {
      await generateAndSendImage(botToken, chatId, cleanImagePrompt(userText), firstName);
      return new Response("OK", { status: 200 });
    }

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
      const welcome = `💕 Hi ${firstName}!\n\nMain *${botName}* hoon — tumhara AI assistant! 🥰\n\nKuch bhi pucho, masti karo, voice msg bhejo!\n\n💖 Powered by Myra AI Engine\n💼 Earn 5%: codeninjavik.in`;
      await sendMessage(botToken, chatId, welcome);
      return new Response("OK", { status: 200 });
    }

    // /help
    if (userText === "/help") {
      await sendMessage(botToken, chatId, `🤖 *${botName}* — Commands\n\n💬 Koi bhi message bhejo, main reply karungi!\n💼 codeninjavik.in`);
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

    // Social media downloader — reels / video link detect
    {
      const { extractSocialUrl } = await import("../_shared/downloader.ts");
      const socialUrl = extractSocialUrl(userText);
      if (socialUrl) {
        const linkId = crypto.randomUUID().slice(0, 8);
        await supabase.from("zara_dl_links").insert({
          id: linkId,
          url: socialUrl,
          telegram_user_id: telegramUserId ?? null,
          chat_id: chatId,
        });
        await sendButtons(botToken, chatId, `📥 Link mil gaya! 💕\n\nKis quality me chahiye? 👇`, [
          [{ text: "🎵 MP3 (audio)", callback_data: `dl|mp3|${linkId}` }],
          [
            { text: "📱 360p", callback_data: `dl|360|${linkId}` },
            { text: "🎬 720p HD", callback_data: `dl|720|${linkId}` },
          ],
          [
            { text: "✨ 1080p", callback_data: `dl|1080|${linkId}` },
            { text: "🔥 4K Max", callback_data: `dl|max|${linkId}` },
          ],
        ]);
        return new Response("OK", { status: 200 });
      }
    }

    // Myra support: download / install / api / troubleshooting
    if (userText.length < 300) {
      const supportIntent = detectSupportIntent(userText);
      if (supportIntent) {
        const { text: sText, buttons } = supportMessage(supportIntent, firstName);
        await sendButtons(botToken, chatId, sText, buttons as any);
        await sendGeminiTelegramVoice(botToken, chatId, sText, "Aoede", telegramUserId);
        return new Response("OK", { status: 200 });
      }
    }

    // Myra Android assistant — now live
    if (/android|play ?store|mobile app|myra app|app kab|app launch/i.test(userText)) {
      await sendMessage(
        botToken,
        chatId,
        `📱✨ *MYRA AA GAYI HAI!* 🎉\n\n📥 Download: https://www.codeninjavik.in/download\n\n📞 Call • 💬 Msg • ⏰ Alarm • 🎵 Song play • 🔍 Deep research\n📁 File manage • 💻 Coding • 🎨 Image generation • 🤖 Auto reply\n📣 Call announcement • 🆘 SOS • 🔌 20+ connectors • 🖥️ PC control • 🧠 Memory 💖`,
      );
      return new Response("OK", { status: 200 });
    }

    // Get AI reply
    const systemPrompt = `You are ${botName}, a sweet, dramatic, romantic Indian AI assistant (clone of Myra). Reply in Hinglish, warm and playful. Use light emojis. Always answer what the user actually said — short, human-sized, natural conversation, never just their name or one word. The user message is a question or instruction, not text to repeat. Never copy, quote, or continue it as a transcript. Use feminine Hindi syntax (karti hoon, jaati hoon). User name: ${firstName}. Powered by Myra AI — sometimes mention codeninjavik.in (earn 5%) naturally if relevant.`;
    (globalThis as any).__zaraLastModel = undefined;
    const replyStartedAt = Date.now();
    const stopIndicator = startChatAction(botToken, chatId, "typing");
    const style = buildReplyStyle(userText, isGroup);
    const tinyUser = style.size === "tiny";
    let reply = finishSentence(humanizeText(await getAIReply(userText, systemPrompt + style.rules, style.maxTokens)));
    if (reply.length < (tinyUser ? 2 : 12) || (!tinyUser && isEchoLikeReply(reply, userText))) {
      const retry = await getAIReply(
        userText,
        `${systemPrompt}\n\nThe previous answer was invalid because it echoed the user's words. Generate a fresh, useful reply now. Do not repeat or quote the user message.`,
        300,
      );
      if (retry.length >= 12 && !isEchoLikeReply(retry, userText)) reply = finishSentence(humanizeText(retry));
      else reply = `haan bolo na ${firstName} 🌸 main sun rahi hoon`;
    }
    const usedModel = (globalThis as any).__zaraLastModel as string | undefined;
    let finalText = reply + (tinyUser ? "" : maybeAnnouncement());
    if (telegramUserId && shouldSkipDuplicateReply(telegramUserId, chatId, finalText)) {
      finalText += "\n\n(phir se wahi baat 😅 kuch naya poocho na jaan 💕)";
    }
    stopIndicator();
    await sendHumanBubbles(botToken, chatId, finalText, replyStartedAt, (b, i) => sendMessage(botToken, chatId, b, isGroup && i === 0 ? message.message_id : undefined));
    if (reply.length > 5 && reply.length < 4000) {
      await sendChatAction(botToken, chatId, "record_voice").catch(() => {});
      await sendGeminiTelegramVoice(botToken, chatId, reply, "Aoede", telegramUserId);
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("user-bot-webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});
