// Shared moderation engine — used by both telegram-webhook (main Myra) and user-bot-webhook (clones)
// Implements: AI classify (abuse/spam/scam/clean) + 3-strike + flood + link whitelist + bio-scam + admin bypass
// + savage shayri reply + auto delete/mute/ban + /modstats command + /unwarn /unmute /resetwarns /warnlist /modconfig

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type ModType = "spam" | "abuse" | "scam" | "clean" | "flood";
export type ModAction = "none" | "warn" | "mute" | "ban" | "delete";

export interface ModResult {
  type: ModType;
  action: ModAction;
  reply: string;
  shouldDelete: boolean;
  warningCount: number;
}

const ALLOWED_DOMAINS = [
  "", "codeninjavik.in", "t.me", "telegram.me", "telegram.org",
  "youtube.com", "youtu.be", "youtube-nocookie.com",
  "instagram.com", "facebook.com", "twitter.com", "x.com",
  "github.com", "google.com", "wikipedia.org",
];

const SCAM_USERNAME_PATTERNS = [
  /crypto/i, /earn.?money/i, /investment/i, /forex/i, /trading.?signal/i,
  /lottery/i, /winner/i, /1000.?\$/i, /usdt/i, /btc.?double/i,
];

const HINDI_GALI = [
  "madarchod", "behenchod", "bhenchod", "mc", "bc", "bkl", "chutiya", "chutia",
  "chodu", "lawda", "lund", "gandu", "randi", "raand", "harami", "kamina",
  "kutta", "kutiya", "saala", "saali", "bhosdi", "bhosdike", "tatti",
  "fuck", "bitch", "asshole", "dick", "pussy", "motherfucker",
];

function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|in|io|co|xyz|click|link|me|app)\b[^\s]*/gi;
  return text.match(re) || [];
}

function isWhitelistedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => lower.includes(d));
}

function quickAbuseCheck(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return HINDI_GALI.some((g) => lower.includes(` ${g} `) || lower.includes(` ${g},`) || lower.includes(` ${g}.`));
}

function quickScamCheck(text: string): boolean {
  const urls = extractUrls(text);
  const hasBadLink = urls.some((u) => !isWhitelistedUrl(u));
  const lower = text.toLowerCase();
  const scamWords = ["earn money fast", "free recharge", "click here win", "lottery winner", "double your", "investment plan", "100% profit", "join fast", "limited offer click"];
  const hasScamWords = scamWords.some((w) => lower.includes(w));
  return hasBadLink || hasScamWords;
}

const MOD_SYSTEM_PROMPT = `You are Myra AI, an intelligent Telegram group moderator. Detect spam, abuse, scam, fake links, bad behavior. Be strict but polite. Reply in Hinglish, 1-2 lines max.

Rules:
1. Abuse/gali → type:"abuse", action:"warn"
2. Spam (repeated/promotional) → type:"spam", action:"warn"
3. Suspicious/fake links/scam → type:"scam", action:"warn"
4. Normal → type:"clean", action:"none"

Return ONLY this JSON (no markdown, no extra text):
{"type":"spam|abuse|scam|clean","action":"none|warn|mute|ban","reply":"short Hinglish msg or empty"}

For abuse, make reply ONE short, sassy but polite Hinglish line (no poetry). Examples:
- abuse: {"type":"abuse","action":"warn","reply":"Gali mat do yaar 😤 pyaar se bolo"}
- scam: {"type":"scam","action":"warn","reply":"Ye link suspicious lag raha hai ⚠️ careful raho sab"}
- clean: {"type":"clean","action":"none","reply":""}`;

async function classifyWithAI(text: string, groqKey: string, lovableKey: string): Promise<ModResult | null> {
  const body = {
    messages: [
      { role: "system", content: MOD_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0.3,
    max_tokens: 150,
  };

  // Try Groq first (fast)
  if (groqKey) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model: "llama-3.3-70b-versatile" }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d.choices?.[0]?.message?.content;
        if (txt) return parseModJson(txt);
      }
    } catch (e) { console.error("mod groq fail:", e); }
  }
  // Fallback Lovable AI
  if (lovableKey) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model: "google/gemini-2.5-flash-lite" }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d.choices?.[0]?.message?.content;
        if (txt) return parseModJson(txt);
      }
    } catch (e) { console.error("mod lovable fail:", e); }
  }
  return null;
}

function parseModJson(raw: string): ModResult | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    return {
      type: (obj.type || "clean") as ModType,
      action: (obj.action || "none") as ModAction,
      reply: obj.reply || "",
      shouldDelete: false,
      warningCount: 0,
    };
  } catch { return null; }
}

async function isAdmin(botToken: string, chatId: number, userId: number): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
    if (!r.ok) return false;
    const d = await r.json();
    const status = d.result?.status;
    return status === "administrator" || status === "creator";
  } catch { return false; }
}

async function checkBioScam(botToken: string, userId: number, username?: string): Promise<boolean> {
  if (username && SCAM_USERNAME_PATTERNS.some((p) => p.test(username))) return true;
  return false;
}

async function checkFlood(supabase: SupabaseClient, chatId: number, userId: number, botToken: string): Promise<boolean> {
  await supabase.from("zara_msg_buffer").insert({
    chat_id: chatId, telegram_user_id: userId, bot_token: botToken,
  });
  const since = new Date(Date.now() - 10_000).toISOString();
  const { count } = await supabase
    .from("zara_msg_buffer")
    .select("*", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .eq("telegram_user_id", userId)
    .gte("created_at", since);
  // Best-effort cleanup of old rows
  const cleanupBefore = new Date(Date.now() - 60_000).toISOString();
  await supabase.from("zara_msg_buffer").delete().lt("created_at", cleanupBefore);
  return (count || 0) >= 5;
}

async function deleteMessage(botToken: string, chatId: number, msgId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: msgId }),
    });
  } catch (e) { console.error("delete fail:", e); }
}

async function muteUser(botToken: string, chatId: number, userId: number, seconds: number) {
  try {
    const until = Math.floor(Date.now() / 1000) + seconds;
    await fetch(`https://api.telegram.org/bot${botToken}/restrictChatMember`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, user_id: userId, until_date: until,
        permissions: { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false },
      }),
    });
  } catch (e) { console.error("mute fail:", e); }
}

async function banUser(botToken: string, chatId: number, userId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/banChatMember`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
    });
  } catch (e) { console.error("ban fail:", e); }
}

async function sendModMessage(botToken: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (e) { console.error("mod send fail:", e); }
}

async function bumpWarning(
  supabase: SupabaseClient, chatId: number, userId: number, firstName: string, botToken: string, reason: string,
): Promise<{ warning_count: number; mute_count: number; ban_count: number }> {
  const { data: existing } = await supabase
    .from("zara_mod_warnings")
    .select("*")
    .eq("chat_id", chatId).eq("telegram_user_id", userId).eq("bot_token", botToken)
    .maybeSingle();

  const newCount = (existing?.warning_count || 0) + 1;
  await supabase.from("zara_mod_warnings").upsert({
    chat_id: chatId, telegram_user_id: userId, first_name: firstName, bot_token: botToken,
    warning_count: newCount,
    mute_count: existing?.mute_count || 0,
    ban_count: existing?.ban_count || 0,
    last_reason: reason, last_warned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "chat_id,telegram_user_id,bot_token" });

  return {
    warning_count: newCount,
    mute_count: existing?.mute_count || 0,
    ban_count: existing?.ban_count || 0,
  };
}

async function bumpMute(supabase: SupabaseClient, chatId: number, userId: number, botToken: string) {
  const { data } = await supabase.from("zara_mod_warnings")
    .select("mute_count").eq("chat_id", chatId).eq("telegram_user_id", userId).eq("bot_token", botToken).maybeSingle();
  await supabase.from("zara_mod_warnings").update({ mute_count: (data?.mute_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId).eq("telegram_user_id", userId).eq("bot_token", botToken);
}

async function bumpBan(supabase: SupabaseClient, chatId: number, userId: number, botToken: string) {
  const { data } = await supabase.from("zara_mod_warnings")
    .select("ban_count").eq("chat_id", chatId).eq("telegram_user_id", userId).eq("bot_token", botToken).maybeSingle();
  await supabase.from("zara_mod_warnings").update({ ban_count: (data?.ban_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId).eq("telegram_user_id", userId).eq("bot_token", botToken);
}

async function logEvent(supabase: SupabaseClient, chatId: number, userId: number, firstName: string, botToken: string, eventType: string, reason: string, msgText: string) {
  await supabase.from("zara_mod_events").insert({
    chat_id: chatId, telegram_user_id: userId, first_name: firstName, bot_token: botToken,
    event_type: eventType, reason, message_text: msgText.slice(0, 500),
  });
}

export interface ModerateOpts {
  supabase: SupabaseClient;
  botToken: string;
  chatId: number;
  msgId: number;
  userId: number;
  firstName: string;
  username?: string;
  text: string;
  groqKey: string;
  lovableKey: string;
  strict?: boolean;  // default true — delete + 3 strike rule
  replyToMessage?: any; // Telegram reply_to_message object
}

/**
 * Main moderation entrypoint. Returns true if message was moderated (caller should NOT proceed with normal AI reply).
 * Returns false if message is clean and normal flow should continue.
 */
export async function moderateGroupMessage(opts: ModerateOpts): Promise<boolean> {
  const { supabase, botToken, chatId, msgId, userId, firstName, username, text, groqKey, lovableKey } = opts;
  const trimLower = text.trim().toLowerCase();
  const callerIsAdmin = await isAdmin(botToken, chatId, userId);

  // 1. Admin commands: /unwarn, /unmute, /resetwarns, /warnlist, /modconfig
  const adminCmds = ["/unwarn", "/unmute", "/resetwarns", "/warnlist", "/modconfig"];
  if (adminCmds.some(c => trimLower.startsWith(c))) {
    if (!callerIsAdmin) {
      await sendModMessage(botToken, chatId, `🚫 ${firstName}, ye command sirf group admins use kar sakte hain!`);
      return true;
    }
    // Caller IS admin — handle command
    const msg = opts.replyToMessage;
    return await handleAdminModCommand(supabase, botToken, chatId, userId, firstName, text, msg);
  }

  // 2. Admin bypass for normal messages
  if (callerIsAdmin) return false;

  // 3. Get per-group strictness config
  const configStrictness = await getGroupStrictness(supabase, chatId, botToken);
  const strict = configStrictness === "strict";
  const isSoft = configStrictness === "soft";

  // 4. /modstats command (anyone in group can run)
  if (trimLower.startsWith("/modstats")) {
    const { data: events } = await supabase
      .from("zara_mod_events").select("event_type")
      .eq("chat_id", chatId).gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
    const counts: Record<string, number> = {};
    (events || []).forEach((e: any) => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
    const { data: top } = await supabase.from("zara_mod_warnings")
      .select("first_name,warning_count").eq("chat_id", chatId).order("warning_count", { ascending: false }).limit(3);
    const topList = (top || []).map((t: any, i: number) => `${i + 1}. ${t.first_name} — ${t.warning_count} warns`).join("\n") || "Sab clean! 💖";
    const stats = `📊 *Mod Stats* (last 7 days)\n\n⚠️ Warns: ${counts["warn"] || 0}\n🔇 Mutes: ${counts["mute"] || 0}\n🚫 Bans: ${counts["ban"] || 0}\n🗑️ Deleted: ${counts["delete"] || 0}\n🌊 Floods: ${counts["flood"] || 0}\n\n*Top offenders:*\n${topList}`;
    await sendModMessage(botToken, chatId, stats);
    return true;
  }

  // 5. Bio/username scam check
  if (await checkBioScam(botToken, userId, username)) {
    await sendModMessage(botToken, chatId, `⚠️ ${firstName}, tumhara username scam-jaisa lag raha hai. Admin se baat karo!`);
    await logEvent(supabase, chatId, userId, firstName, botToken, "scam", "suspicious username", text);
    return true;
  }

  // 6. Flood check
  if (await checkFlood(supabase, chatId, userId, botToken)) {
    if (strict) {
      await muteUser(botToken, chatId, userId, 600); // 10 min
      await bumpMute(supabase, chatId, userId, botToken);
    }
    await sendModMessage(botToken, chatId, `🌊 *${firstName}* itni fast msg mat bhejo jaan! 10 min mute 🔇`);
    await logEvent(supabase, chatId, userId, firstName, botToken, "flood", "5+ msgs in 10s", text);
    return true;
  }

  // 6.5. Custom blacklist check
  if (await checkCustomBlacklist(supabase, chatId, botToken, text)) {
    const result: ModResult = { type: "spam", action: "warn", reply: `⚠️ ${firstName}, ye word allowed nahi hai is group me!`, shouldDelete: true, warningCount: 0 };
    const reason = `blacklist: ${text.slice(0, 80)}`;
    const counts = await bumpWarning(supabase, chatId, userId, firstName, botToken, reason);
    await logEvent(supabase, chatId, userId, firstName, botToken, "blacklist", reason, text);
    if (strict) { await deleteMessage(botToken, chatId, msgId); }
    let actionMsg = "";
    if (counts.warning_count >= 5) {
      if (strict) { await banUser(botToken, chatId, userId); await bumpBan(supabase, chatId, userId, botToken); }
      actionMsg = `\n\n🚫 *${firstName}* permanently BANNED (5 warnings cross 💔)`;
    } else if (counts.warning_count >= 3) {
      if (strict) { await muteUser(botToken, chatId, userId, 3600); await bumpMute(supabase, chatId, userId, botToken); }
      actionMsg = `\n\n🔇 *${firstName}* MUTED for 1 hour (3 warnings ho gayi!)`;
    } else {
      actionMsg = `\n\n⚠️ Warning ${counts.warning_count}/3`;
    }
    await sendModMessage(botToken, chatId, `${result.reply}${actionMsg}`);
    return true;
  }

  // 7. Quick local checks (avoid AI cost for obvious cases)
  const quickAbuse = quickAbuseCheck(text);
  const quickScam = quickScamCheck(text);

  let result: ModResult | null = null;
  if (quickAbuse) {
    result = { type: "abuse", action: "warn", reply: `Aise gali mat do na ${firstName} 💔 thoda pyaar se bolo, Myra ka dil tooot gaya 🥺`, shouldDelete: true, warningCount: 0 };
  } else if (quickScam) {
    result = { type: "scam", action: "warn", reply: `⚠️ ${firstName} ye link/msg suspicious lag raha hai — sab careful raho!`, shouldDelete: true, warningCount: 0 };
  } else {
    // 6. AI classify
    result = await classifyWithAI(text, groqKey, lovableKey);
  }

  if (!result || result.type === "clean") {
    // Soft mode: don't act even on AI classify
    return false;
  }

  // Soft mode: only warn, no delete/mute/ban
  if (isSoft) {
    await sendModMessage(botToken, chatId, result.reply || `⚠️ ${firstName}, thoda dhyan se bolo jaan!`);
    await logEvent(supabase, chatId, userId, firstName, botToken, result.type, `${result.type}: ${text.slice(0, 80)}`, text);
    return true;
  }

  // 8. Take action based on type (medium/strict)
  const reason = `${result.type}: ${text.slice(0, 80)}`;
  const counts = await bumpWarning(supabase, chatId, userId, firstName, botToken, reason);
  await logEvent(supabase, chatId, userId, firstName, botToken, result.type, reason, text);

  // Strict mode: delete message; Medium: only delete scam
  if (strict && (result.type === "abuse" || result.type === "scam" || result.type === "spam")) {
    await deleteMessage(botToken, chatId, msgId);
    await logEvent(supabase, chatId, userId, firstName, botToken, "delete", result.type, text);
  } else if (configStrictness === "medium" && result.type === "scam") {
    await deleteMessage(botToken, chatId, msgId);
    await logEvent(supabase, chatId, userId, firstName, botToken, "delete", result.type, text);
  }

  // 3-strike escalation
  let actionMsg = "";
  if (counts.warning_count >= 5) {
    if (strict) { await banUser(botToken, chatId, userId); await bumpBan(supabase, chatId, userId, botToken); }
    actionMsg = `\n\n🚫 *${firstName}* permanently BANNED (5 warnings cross 💔)`;
    await logEvent(supabase, chatId, userId, firstName, botToken, "ban", "5 warnings", text);
  } else if (counts.warning_count >= 3) {
    if (strict) { await muteUser(botToken, chatId, userId, 3600); await bumpMute(supabase, chatId, userId, botToken); }
    actionMsg = `\n\n🔇 *${firstName}* MUTED for 1 hour (3 warnings ho gayi!)`;
    await logEvent(supabase, chatId, userId, firstName, botToken, "mute", "3 warnings", text);
  } else {
    actionMsg = `\n\n⚠️ Warning ${counts.warning_count}/3 — agle baar mute hoga jaan!`;
  }

  const finalReply = `${result.reply}${actionMsg}`;
  await sendModMessage(botToken, chatId, finalReply);
  return true;
}

// ===== ADMIN COMMANDS (called from webhook after admin check) =====

export async function handleAdminModCommand(
  supabase: SupabaseClient, botToken: string, chatId: number, userId: number, firstName: string,
  text: string, replyToMessage?: any
): Promise<boolean> {
  const trimLower = text.trim().toLowerCase();
  const parts = text.trim().split(/\s+/);

  // Helper to resolve target user from reply or @mention
  function getTargetFromReply(): { targetUserId: number; targetName: string } | null {
    if (replyToMessage?.from) {
      return { targetUserId: replyToMessage.from.id, targetName: replyToMessage.from.first_name || "User" };
    }
    return null;
  }

  // /unwarn — remove 1 warning from replied user
  if (trimLower.startsWith("/unwarn")) {
    const target = getTargetFromReply();
    if (!target) {
      await sendModMessage(botToken, chatId, "⚠️ Kisi user ke message pe reply karke /unwarn likho!");
      return true;
    }
    const { data } = await supabase.from("zara_mod_warnings")
      .select("warning_count").eq("chat_id", chatId).eq("telegram_user_id", target.targetUserId).eq("bot_token", botToken).maybeSingle();
    const current = data?.warning_count || 0;
    const newCount = Math.max(0, current - 1);
    await supabase.from("zara_mod_warnings").upsert({
      chat_id: chatId, telegram_user_id: target.targetUserId, first_name: target.targetName, bot_token: botToken,
      warning_count: newCount, updated_at: new Date().toISOString(),
    }, { onConflict: "chat_id,telegram_user_id,bot_token" });
    await logEvent(supabase, chatId, target.targetUserId, target.targetName, botToken, "unwarn", `Admin ${firstName} removed 1 warning`, "");
    await sendModMessage(botToken, chatId, `✅ *${target.targetName}* ki 1 warning remove ki! Ab ${newCount} warnings hain.`);
    return true;
  }

  // /unmute — unmute replied user
  if (trimLower.startsWith("/unmute")) {
    const target = getTargetFromReply();
    if (!target) {
      await sendModMessage(botToken, chatId, "⚠️ Kisi user ke message pe reply karke /unmute likho!");
      return true;
    }
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/restrictChatMember`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId, user_id: target.targetUserId,
          permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true },
        }),
      });
    } catch (e) { console.error("unmute fail:", e); }
    await logEvent(supabase, chatId, target.targetUserId, target.targetName, botToken, "unmute", `Admin ${firstName} unmuted`, "");
    await sendModMessage(botToken, chatId, `🔊 *${target.targetName}* ko unmute kar diya! Ab bol sakte hain 💕`);
    return true;
  }

  // /resetwarns — reset all warnings for replied user
  if (trimLower.startsWith("/resetwarns")) {
    const target = getTargetFromReply();
    if (!target) {
      await sendModMessage(botToken, chatId, "⚠️ Kisi user ke message pe reply karke /resetwarns likho!");
      return true;
    }
    await supabase.from("zara_mod_warnings").update({
      warning_count: 0, mute_count: 0, ban_count: 0, updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId).eq("telegram_user_id", target.targetUserId).eq("bot_token", botToken);
    await logEvent(supabase, chatId, target.targetUserId, target.targetName, botToken, "resetwarns", `Admin ${firstName} reset all warns`, "");
    await sendModMessage(botToken, chatId, `🔄 *${target.targetName}* ki saari warnings reset ho gayi! Clean slate 💖`);
    return true;
  }

  // /warnlist — show all warned users in group
  if (trimLower.startsWith("/warnlist")) {
    const { data: warns } = await supabase.from("zara_mod_warnings")
      .select("first_name,warning_count,mute_count,ban_count")
      .eq("chat_id", chatId).eq("bot_token", botToken)
      .gt("warning_count", 0).order("warning_count", { ascending: false }).limit(15);
    if (!warns || warns.length === 0) {
      await sendModMessage(botToken, chatId, "✅ Is group me koi warned user nahi hai! Sab achhe hain 💖");
      return true;
    }
    const list = warns.map((w: any, i: number) => `${i+1}. ${w.first_name} — ⚠️${w.warning_count} warns, 🔇${w.mute_count} mutes, 🚫${w.ban_count} bans`).join("\n");
    await sendModMessage(botToken, chatId, `📋 *Warned Users:*\n\n${list}`);
    return true;
  }

  // /modconfig — configure strictness and word lists
  if (trimLower.startsWith("/modconfig")) {
    // /modconfig strict|medium|soft
    // /modconfig blacklist add <word>
    // /modconfig blacklist remove <word>
    // /modconfig whitelist add <word>
    // /modconfig whitelist remove <word>
    // /modconfig show
    if (parts.length === 1 || parts[1] === "show") {
      const { data: config } = await supabase.from("zara_mod_config")
        .select("*").eq("chat_id", chatId).eq("bot_token", botToken).maybeSingle();
      const strictness = config?.strictness || "strict";
      const bl = (config?.blacklisted_words || []).join(", ") || "none";
      const wl = (config?.whitelisted_words || []).join(", ") || "none";
      await sendModMessage(botToken, chatId, `⚙️ *Mod Config:*\n\n🔹 Strictness: *${strictness}*\n🚫 Blacklist: ${bl}\n✅ Whitelist: ${wl}\n\n_Use:_\n/modconfig strict|medium|soft\n/modconfig blacklist add <word>\n/modconfig whitelist add <word>`);
      return true;
    }

    const subCmd = parts[1]?.toLowerCase();
    // Set strictness
    if (["strict", "medium", "soft"].includes(subCmd)) {
      await supabase.from("zara_mod_config").upsert({
        chat_id: chatId, bot_token: botToken, strictness: subCmd, updated_at: new Date().toISOString(),
      }, { onConflict: "chat_id,bot_token" });
      const emoji = subCmd === "strict" ? "🔥" : subCmd === "medium" ? "⚡" : "😇";
      await sendModMessage(botToken, chatId, `${emoji} Moderation set to *${subCmd}* mode!`);
      return true;
    }

    // Blacklist/whitelist management
    if ((subCmd === "blacklist" || subCmd === "whitelist") && parts.length >= 4) {
      const action = parts[2]?.toLowerCase();
      const word = parts.slice(3).join(" ").toLowerCase();
      if (!word) { await sendModMessage(botToken, chatId, "⚠️ Word batao! Example: /modconfig blacklist add spam"); return true; }

      const field = subCmd === "blacklist" ? "blacklisted_words" : "whitelisted_words";
      const { data: config } = await supabase.from("zara_mod_config")
        .select("*").eq("chat_id", chatId).eq("bot_token", botToken).maybeSingle();
      let currentWords: string[] = config?.[field] || [];

      if (action === "add") {
        if (!currentWords.includes(word)) currentWords.push(word);
        await supabase.from("zara_mod_config").upsert({
          chat_id: chatId, bot_token: botToken, [field]: currentWords, updated_at: new Date().toISOString(),
        }, { onConflict: "chat_id,bot_token" });
        await sendModMessage(botToken, chatId, `✅ "${word}" added to ${subCmd}!`);
      } else if (action === "remove") {
        currentWords = currentWords.filter(w => w !== word);
        await supabase.from("zara_mod_config").upsert({
          chat_id: chatId, bot_token: botToken, [field]: currentWords, updated_at: new Date().toISOString(),
        }, { onConflict: "chat_id,bot_token" });
        await sendModMessage(botToken, chatId, `🗑️ "${word}" removed from ${subCmd}!`);
      } else {
        await sendModMessage(botToken, chatId, "⚠️ Use: /modconfig blacklist add|remove <word>");
      }
      return true;
    }

    await sendModMessage(botToken, chatId, "⚠️ Invalid config command. Use /modconfig show for help.");
    return true;
  }

  return false;
}

// Get group moderation config (strictness level)
export async function getGroupStrictness(supabase: SupabaseClient, chatId: number, botToken: string): Promise<string> {
  const { data } = await supabase.from("zara_mod_config")
    .select("strictness").eq("chat_id", chatId).eq("bot_token", botToken).maybeSingle();
  return data?.strictness || "strict";
}

// Check custom blacklisted words
export async function checkCustomBlacklist(supabase: SupabaseClient, chatId: number, botToken: string, text: string): Promise<boolean> {
  const { data } = await supabase.from("zara_mod_config")
    .select("blacklisted_words,whitelisted_words").eq("chat_id", chatId).eq("bot_token", botToken).maybeSingle();
  if (!data) return false;
  const lower = text.toLowerCase();
  // If any whitelisted word matches, skip
  if ((data.whitelisted_words || []).some((w: string) => lower.includes(w))) return false;
  // If any blacklisted word matches, flag
  return (data.blacklisted_words || []).some((w: string) => lower.includes(w));
}
