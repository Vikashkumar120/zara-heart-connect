// Group admin toolkit — shared by telegram-webhook (main bot) and user-bot-webhook (clones)
// Commands: /kick /ban /unban /mute /unmute /warn /warns /unwarn /clearwarns /pin
//           /purge /delmsg /cleanbot /antiflood /antilink /bioremove /approve /unapprove /approvelist
//           /antiforward /join_remove /badword /promote /demote /kickme /adminhelp
// Filters (non-admins only): antiforward, antilink, bioremove, antiflood, badword (3 warns = kick)

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const MAX_WARNS = 3;

export const ADMIN_HELP = `🌸 *Group Admin — Help*

👮 *Moderation*
/kick — Kisi ko group se nikalo
/ban — Permanent ban karo
/unban — Ban hatao
/mute [10m/1h] — Chup karao
/unmute — Awaaz wapas do
/warn [reason] — Warning do
/warns — Kitne warns hain
/unwarn — Last warn hatao
/clearwarns — Sab warns reset
/pin — Reply karke pin (silent)
/pin loud — Pin + notification

🗑 *Cleanup*
/purge — Reply se yahan tak delete
/purge 20 — Last 20 msgs delete
/delmsg 10 — Last 10 msgs delete
/cleanbot — Bot ke sab msgs saaf

⚙️ *Group Settings*
/antiflood on/off/5 — Flood protection
/antilink on/off — Link auto-delete
/bioremove on/off — Bio mein link wale users ka msg delete
/approve — Bio-filter whitelist (reply ya user_id)
/unapprove — Whitelist hatao
/approvelist — Approved users
/antiforward on/off — Forwarded msgs delete
/join\\_remove on/off — Join/leave msgs hide

🚫 *Badword Filter*
/badword add <word> · del <word> · list · clear
3 warns = auto kick

👑 *Admin Control*
/promote — Admin bana do
/demote — Admin rights wapas lo
/kickme — Khud group se niklo

⚡ Sirf group admins ke liye`;

interface Settings {
  antiflood_limit: number;
  antilink: boolean;
  bioremove: boolean;
  antiforward: boolean;
  join_remove: boolean;
  blacklisted_words: string[];
}

export interface GroupAdminOpts {
  supabase: SupabaseClient;
  botToken: string;
  message: any; // Telegram message object
}

// ---------- Telegram helpers ----------

async function tg(botToken: string, method: string, body: Record<string, unknown>): Promise<any> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return await r.json().catch(() => ({ ok: false }));
  } catch (e) {
    console.error(`tg ${method} failed:`, e);
    return { ok: false, description: String(e) };
  }
}

let trackerClient: SupabaseClient | null = null;

/** Record a message sent by the bot in a group so /cleanbot can remove it later. */
export function recordBotMessage(botToken: string, chatId: number, messageId: number | undefined) {
  if (!trackerClient || !messageId || chatId >= 0) return;
  trackerClient.from("zara_bot_msgs")
    .upsert({ chat_id: chatId, bot_token: botToken, message_id: messageId }, { onConflict: "chat_id,bot_token,message_id" })
    .then(() => {}, () => {});
}

async function reply(botToken: string, chatId: number, text: string) {
  const r = await tg(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
  const res = r.ok ? r : await tg(botToken, "sendMessage", { chat_id: chatId, text: text.replace(/[*_`]/g, "") });
  recordBotMessage(botToken, chatId, res?.result?.message_id);
}

const deleteMsg = (botToken: string, chatId: number, messageId: number) =>
  tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId });

async function deleteMany(botToken: string, chatId: number, ids: number[]) {
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const r = await tg(botToken, "deleteMessages", { chat_id: chatId, message_ids: chunk });
    if (!r.ok) await Promise.all(chunk.map((id) => deleteMsg(botToken, chatId, id)));
  }
}

const adminCache = new Map<string, { status: string; at: number }>();

async function memberStatus(botToken: string, chatId: number, userId: number): Promise<string> {
  const key = `${botToken}:${chatId}:${userId}`;
  const hit = adminCache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.status;
  const r = await tg(botToken, "getChatMember", { chat_id: chatId, user_id: userId });
  const status = r.ok ? r.result?.status || "unknown" : "unknown";
  adminCache.set(key, { status, at: Date.now() });
  return status;
}

const isAdminStatus = (s: string) => s === "administrator" || s === "creator";

async function kickUser(botToken: string, chatId: number, userId: number) {
  const r = await tg(botToken, "banChatMember", { chat_id: chatId, user_id: userId });
  if (r.ok) await tg(botToken, "unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
  return r.ok;
}

const FULL_PERMS = {
  can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true,
  can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true,
  can_send_other_messages: true, can_add_web_page_previews: true,
};
const NO_PERMS = Object.fromEntries(Object.keys(FULL_PERMS).map((k) => [k, false]));

// ---------- Settings ----------

async function loadSettings(supabase: SupabaseClient, chatId: number, botToken: string): Promise<Settings> {
  const { data } = await supabase.from("zara_mod_config")
    .select("antiflood_limit,antilink,bioremove,antiforward,join_remove,blacklisted_words")
    .eq("chat_id", chatId).eq("bot_token", botToken).maybeSingle();
  return {
    antiflood_limit: data?.antiflood_limit || 0,
    antilink: !!data?.antilink,
    bioremove: !!data?.bioremove,
    antiforward: !!data?.antiforward,
    join_remove: !!data?.join_remove,
    blacklisted_words: data?.blacklisted_words || [],
  };
}

async function saveSettings(supabase: SupabaseClient, chatId: number, botToken: string, patch: Record<string, unknown>) {
  await supabase.from("zara_mod_config").upsert(
    { chat_id: chatId, bot_token: botToken, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "chat_id,bot_token" },
  );
}

// ---------- Helpers ----------

/** "10m" "1h" "2d" "30s" → seconds. Bare number = minutes. */
function parseDuration(s?: string): number | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/^(\d+)\s*([smhd]?)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2] || "m";
  return n * ({ s: 1, m: 60, h: 3600, d: 86400 } as Record<string, number>)[unit];
}

function formatDuration(sec: number): string {
  if (sec % 86400 === 0) return `${sec / 86400} din`;
  if (sec % 3600 === 0) return `${sec / 3600} ghanta`;
  if (sec % 60 === 0) return `${sec / 60} min`;
  return `${sec} sec`;
}

interface Target { id: number; name: string }

/** Target from reply, text_mention entity, or a numeric user id in args. */
function resolveTarget(message: any, args: string[]): Target | null {
  const rf = message.reply_to_message?.from;
  if (rf) return { id: rf.id, name: rf.first_name || "User" };
  for (const e of message.entities || []) {
    if (e.type === "text_mention" && e.user) return { id: e.user.id, name: e.user.first_name || "User" };
  }
  const idArg = args.find((a) => /^\d{5,}$/.test(a));
  if (idArg) return { id: parseInt(idArg, 10), name: idArg };
  return null;
}

const hasLink = (msg: any): boolean => {
  const text: string = msg.text || msg.caption || "";
  const ents = [...(msg.entities || []), ...(msg.caption_entities || [])];
  if (ents.some((e: any) => e.type === "url" || e.type === "text_link")) return true;
  return /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(com|net|org|in|io|co|xyz|me|app|link|click)\b)/i.test(text);
};

const bioCache = new Map<string, { bad: boolean; at: number }>();

async function bioHasLink(botToken: string, userId: number): Promise<boolean> {
  const key = `${botToken}:${userId}`;
  const hit = bioCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.bad;
  const r = await tg(botToken, "getChat", { chat_id: userId });
  const bio: string = r.ok ? r.result?.bio || "" : "";
  const bad = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|@[a-z][a-z0-9_]{4,})/i.test(bio);
  bioCache.set(key, { bad, at: Date.now() });
  return bad;
}

const floodMap = new Map<string, number[]>();

function floodHit(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (floodMap.get(key) || []).filter((t) => now - t < 10_000);
  arr.push(now);
  floodMap.set(key, arr);
  if (floodMap.size > 5000) floodMap.clear();
  return arr.length > limit;
}

async function addWarn(
  supabase: SupabaseClient, botToken: string, chatId: number, target: Target, reason: string,
): Promise<number> {
  const { data } = await supabase.from("zara_mod_warnings").select("*")
    .eq("chat_id", chatId).eq("telegram_user_id", target.id).eq("bot_token", botToken).maybeSingle();
  const count = (data?.warning_count || 0) + 1;
  await supabase.from("zara_mod_warnings").upsert({
    chat_id: chatId, telegram_user_id: target.id, bot_token: botToken, first_name: target.name,
    warning_count: count, mute_count: data?.mute_count || 0, ban_count: data?.ban_count || 0,
    last_reason: reason, last_warned_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "chat_id,telegram_user_id,bot_token" });
  return count;
}

async function setWarnCount(supabase: SupabaseClient, botToken: string, chatId: number, target: Target, count: number) {
  await supabase.from("zara_mod_warnings").upsert({
    chat_id: chatId, telegram_user_id: target.id, bot_token: botToken, first_name: target.name,
    warning_count: count, updated_at: new Date().toISOString(),
  }, { onConflict: "chat_id,telegram_user_id,bot_token" });
}

/** Warn + auto-kick at MAX_WARNS. Returns the status line to post. */
async function warnAndMaybeKick(
  supabase: SupabaseClient, botToken: string, chatId: number, target: Target, reason: string,
): Promise<string> {
  const count = await addWarn(supabase, botToken, chatId, target, reason);
  if (count >= MAX_WARNS) {
    const ok = await kickUser(botToken, chatId, target.id);
    await setWarnCount(supabase, botToken, chatId, target, 0);
    return ok
      ? `🚪 *${target.name}* ko ${MAX_WARNS}/${MAX_WARNS} warns ke baad group se kick kar diya!`
      : `⚠️ *${target.name}* ke ${MAX_WARNS} warns ho gaye, par kick nahi ho paya (bot ko ban rights chahiye).`;
  }
  return `⚠️ *${target.name}* — Warning ${count}/${MAX_WARNS}\n📝 ${reason}`;
}

// ---------- Service messages (join/leave) ----------

/** Call for new_chat_members / left_chat_member updates. Deletes the service message if /join_remove is on. */
export async function handleServiceMessage(opts: GroupAdminOpts): Promise<void> {
  const { supabase, botToken, message } = opts;
  trackerClient = supabase;
  if (!message?.chat || !(message.new_chat_members || message.left_chat_member)) return;
  const s = await loadSettings(supabase, message.chat.id, botToken);
  if (s.join_remove) await deleteMsg(botToken, message.chat.id, message.message_id);
}

// ---------- Main entry ----------

/**
 * Returns true when the message was fully handled (command executed or message removed by a filter)
 * and the caller must stop processing it.
 */
export async function runGroupAdmin(opts: GroupAdminOpts): Promise<boolean> {
  const { supabase, botToken, message } = opts;
  trackerClient = supabase;
  const chatId: number = message.chat.id;
  const userId: number | undefined = message.from?.id;
  if (!userId || message.from?.is_bot) return false;

  if (message.new_chat_members || message.left_chat_member) {
    await handleServiceMessage(opts);
    return false;
  }

  const rawText: string = message.text || "";
  const [cmdRaw, ...args] = rawText.trim().split(/\s+/);
  const cmd = cmdRaw.startsWith("/") ? cmdRaw.toLowerCase().replace(/@\w+$/, "") : "";

  if (cmd && COMMANDS.has(cmd)) {
    const status = await memberStatus(botToken, chatId, userId);
    const callerIsAdmin = isAdminStatus(status);
    // /kickme works for everyone
    if (cmd === "/kickme") return await cmdKickMe(opts, userId, callerIsAdmin);
    if (!callerIsAdmin) {
      await reply(botToken, chatId, `🚫 ${message.from.first_name || "User"}, ye command sirf group admins ke liye hai!`);
      return true;
    }
    return await runCommand(opts, cmd, args, userId);
  }

  // ----- filters -----
  const status = await memberStatus(botToken, chatId, userId);
  if (isAdminStatus(status)) return false;

  const s = await loadSettings(supabase, chatId, botToken);
  const name = message.from.first_name || "User";
  const text: string = message.text || message.caption || "";

  if (s.antiforward && (message.forward_origin || message.forward_date || message.forward_from || message.forward_from_chat)) {
    await deleteMsg(botToken, chatId, message.message_id);
    return true;
  }

  if (s.antilink && hasLink(message)) {
    await deleteMsg(botToken, chatId, message.message_id);
    return true;
  }

  if (s.bioremove && (await bioHasLink(botToken, userId))) {
    const { data: approved } = await supabase.from("zara_group_approved").select("telegram_user_id")
      .eq("chat_id", chatId).eq("bot_token", botToken).eq("telegram_user_id", userId).maybeSingle();
    if (!approved) {
      await deleteMsg(botToken, chatId, message.message_id);
      return true;
    }
  }

  if (s.antiflood_limit > 0 && floodHit(`${botToken}:${chatId}:${userId}`, s.antiflood_limit)) {
    await deleteMsg(botToken, chatId, message.message_id);
    floodMap.delete(`${botToken}:${chatId}:${userId}`);
    await tg(botToken, "restrictChatMember", {
      chat_id: chatId, user_id: userId, permissions: NO_PERMS,
      until_date: Math.floor(Date.now() / 1000) + 300,
    });
    await reply(botToken, chatId, `🌊 *${name}* flood mat karo — 5 min ke liye mute 🔇`);
    return true;
  }

  if (text && s.blacklisted_words.length) {
    const lower = text.toLowerCase();
    const hit = s.blacklisted_words.find((w) => w && lower.includes(w));
    if (hit) {
      await deleteMsg(botToken, chatId, message.message_id);
      const line = await warnAndMaybeKick(supabase, botToken, chatId, { id: userId, name }, `badword: ${hit}`);
      await reply(botToken, chatId, line);
      return true;
    }
  }

  return false;
}

const COMMANDS = new Set([
  "/kick", "/ban", "/unban", "/mute", "/unmute", "/warn", "/warns", "/unwarn", "/clearwarns",
  "/pin", "/purge", "/delmsg", "/cleanbot", "/antiflood", "/antilink", "/bioremove",
  "/approve", "/unapprove", "/approvelist", "/antiforward", "/join_remove", "/badword",
  "/promote", "/demote", "/kickme", "/adminhelp", "/grouphelp",
]);

async function cmdKickMe(opts: GroupAdminOpts, userId: number, callerIsAdmin: boolean): Promise<boolean> {
  const { botToken, message } = opts;
  const chatId = message.chat.id;
  if (callerIsAdmin) {
    await reply(botToken, chatId, "😅 Admin ko main kick nahi kar sakti — pehle admin rights chhodo.");
    return true;
  }
  const ok = await kickUser(botToken, chatId, userId);
  if (!ok) await reply(botToken, chatId, "⚠️ Kick nahi ho paya — bot ko ban rights chahiye.");
  return true;
}

async function runCommand(opts: GroupAdminOpts, cmd: string, args: string[], callerId: number): Promise<boolean> {
  const { supabase, botToken, message } = opts;
  const chatId: number = message.chat.id;
  const say = (t: string) => reply(botToken, chatId, t);
  const needTarget = async (): Promise<Target | null> => {
    const t = resolveTarget(message, args);
    if (!t) await say("⚠️ Kisi user ke message pe reply karo (ya user_id do)!");
    return t;
  };
  // Never act on admins / the bot itself
  const guardTarget = async (t: Target): Promise<boolean> => {
    const st = await memberStatus(botToken, chatId, t.id);
    if (isAdminStatus(st)) {
      await say("😅 Admin pe ye action nahi ho sakta.");
      return false;
    }
    return true;
  };

  switch (cmd) {
    case "/adminhelp":
    case "/grouphelp":
      await say(ADMIN_HELP);
      return true;

    case "/kick": {
      const t = await needTarget(); if (!t || !(await guardTarget(t))) return true;
      const ok = await kickUser(botToken, chatId, t.id);
      await say(ok ? `👢 *${t.name}* ko group se nikal diya!` : "⚠️ Kick fail — bot ko ban rights chahiye.");
      return true;
    }

    case "/ban": {
      const t = await needTarget(); if (!t || !(await guardTarget(t))) return true;
      const r = await tg(botToken, "banChatMember", { chat_id: chatId, user_id: t.id });
      await say(r.ok ? `🚫 *${t.name}* permanently ban!` : "⚠️ Ban fail — bot ko ban rights chahiye.");
      return true;
    }

    case "/unban": {
      const t = await needTarget(); if (!t) return true;
      const r = await tg(botToken, "unbanChatMember", { chat_id: chatId, user_id: t.id, only_if_banned: true });
      await say(r.ok ? `✅ *${t.name}* ka ban hata diya!` : "⚠️ Unban fail.");
      return true;
    }

    case "/mute": {
      const t = await needTarget(); if (!t || !(await guardTarget(t))) return true;
      const dur = parseDuration(args.find((a) => /^\d+[smhd]?$/i.test(a) && !/^\d{5,}$/.test(a)));
      const r = await tg(botToken, "restrictChatMember", {
        chat_id: chatId, user_id: t.id, permissions: NO_PERMS,
        ...(dur ? { until_date: Math.floor(Date.now() / 1000) + dur } : {}),
      });
      await say(r.ok
        ? `🔇 *${t.name}* ko ${dur ? formatDuration(dur) + " ke liye " : ""}mute kar diya!`
        : "⚠️ Mute fail — bot ko restrict rights chahiye.");
      return true;
    }

    case "/unmute": {
      const t = await needTarget(); if (!t) return true;
      const r = await tg(botToken, "restrictChatMember", { chat_id: chatId, user_id: t.id, permissions: FULL_PERMS });
      await say(r.ok ? `🔊 *${t.name}* unmute ho gaye!` : "⚠️ Unmute fail.");
      return true;
    }

    case "/warn": {
      const t = await needTarget(); if (!t || !(await guardTarget(t))) return true;
      const reason = args.filter((a) => a !== String(t.id)).join(" ") || "No reason";
      await say(await warnAndMaybeKick(supabase, botToken, chatId, t, reason));
      return true;
    }

    case "/warns": {
      const t = resolveTarget(message, args) ?? { id: callerId, name: message.from.first_name || "User" };
      const { data } = await supabase.from("zara_mod_warnings").select("warning_count,last_reason")
        .eq("chat_id", chatId).eq("telegram_user_id", t.id).eq("bot_token", botToken).maybeSingle();
      const c = data?.warning_count || 0;
      await say(`📋 *${t.name}* ke ${c}/${MAX_WARNS} warns hain${c && data?.last_reason ? `\n📝 Last: ${data.last_reason}` : ""}`);
      return true;
    }

    case "/unwarn": {
      const t = await needTarget(); if (!t) return true;
      const { data } = await supabase.from("zara_mod_warnings").select("warning_count")
        .eq("chat_id", chatId).eq("telegram_user_id", t.id).eq("bot_token", botToken).maybeSingle();
      const n = Math.max(0, (data?.warning_count || 0) - 1);
      await setWarnCount(supabase, botToken, chatId, t, n);
      await say(`✅ *${t.name}* ki 1 warning hata di — ab ${n}/${MAX_WARNS}.`);
      return true;
    }

    case "/clearwarns": {
      const t = await needTarget(); if (!t) return true;
      await setWarnCount(supabase, botToken, chatId, t, 0);
      await say(`🔄 *${t.name}* ke saare warns reset!`);
      return true;
    }

    case "/pin": {
      const target = message.reply_to_message;
      if (!target) { await say("⚠️ Jis message ko pin karna hai uspe reply karo!"); return true; }
      const loud = (args[0] || "").toLowerCase() === "loud";
      const r = await tg(botToken, "pinChatMessage", {
        chat_id: chatId, message_id: target.message_id, disable_notification: !loud,
      });
      if (!r.ok) await say("⚠️ Pin fail — bot ko pin rights chahiye.");
      return true;
    }

    case "/purge":
    case "/delmsg": {
      const cur: number = message.message_id;
      const n = parseInt(args[0] || "", 10);
      let from: number;
      if (message.reply_to_message && cmd === "/purge") from = message.reply_to_message.message_id;
      else if (n > 0) from = cur - Math.min(n, 200);
      else { await say(cmd === "/purge" ? "⚠️ Reply karo ya number do: /purge 20" : "⚠️ Number do: /delmsg 10"); return true; }
      from = Math.max(1, Math.max(from, cur - 1000));
      const ids: number[] = [];
      for (let i = from; i <= cur; i++) ids.push(i);
      await deleteMany(botToken, chatId, ids);
      return true;
    }

    case "/cleanbot": {
      const { data } = await supabase.from("zara_bot_msgs").select("message_id")
        .eq("chat_id", chatId).eq("bot_token", botToken).order("message_id", { ascending: false }).limit(1000);
      const ids = (data || []).map((r: any) => Number(r.message_id));
      if (ids.length) await deleteMany(botToken, chatId, ids);
      await supabase.from("zara_bot_msgs").delete().eq("chat_id", chatId).eq("bot_token", botToken);
      await deleteMsg(botToken, chatId, message.message_id);
      return true;
    }

    case "/antiflood": {
      const a = (args[0] || "").toLowerCase();
      if (a === "off") { await saveSettings(supabase, chatId, botToken, { antiflood_limit: 0 }); await say("🌊 Antiflood *OFF*"); return true; }
      const n = a === "on" ? 5 : parseInt(a, 10);
      if (!n || n < 2 || n > 50) { await say("⚠️ Use: /antiflood on | off | 5 (2-50 msgs / 10 sec)"); return true; }
      await saveSettings(supabase, chatId, botToken, { antiflood_limit: n });
      await say(`🌊 Antiflood *ON* — ${n} msgs / 10 sec se zyada = 5 min mute`);
      return true;
    }

    case "/antilink":
    case "/bioremove":
    case "/antiforward":
    case "/join_remove": {
      const a = (args[0] || "").toLowerCase();
      if (a !== "on" && a !== "off") { await say(`⚠️ Use: ${cmd} on | off`); return true; }
      const field = cmd.slice(1);
      await saveSettings(supabase, chatId, botToken, { [field]: a === "on" });
      await say(`⚙️ ${field.replace("_", "\\_")} *${a.toUpperCase()}*`);
      return true;
    }

    case "/approve":
    case "/unapprove": {
      const t = await needTarget(); if (!t) return true;
      if (cmd === "/approve") {
        await supabase.from("zara_group_approved").upsert(
          { chat_id: chatId, bot_token: botToken, telegram_user_id: t.id },
          { onConflict: "chat_id,bot_token,telegram_user_id" },
        );
        await say(`✅ *${t.name}* bio-filter se whitelist ho gaye!`);
      } else {
        await supabase.from("zara_group_approved").delete()
          .eq("chat_id", chatId).eq("bot_token", botToken).eq("telegram_user_id", t.id);
        await say(`🗑 *${t.name}* whitelist se hata diye.`);
      }
      return true;
    }

    case "/approvelist": {
      const { data } = await supabase.from("zara_group_approved").select("telegram_user_id")
        .eq("chat_id", chatId).eq("bot_token", botToken);
      await say(data?.length
        ? `✅ *Approved users:*\n${data.map((r: any) => `• \`${r.telegram_user_id}\``).join("\n")}`
        : "Koi approved user nahi hai.");
      return true;
    }

    case "/badword": {
      const sub = (args[0] || "").toLowerCase();
      const s = await loadSettings(supabase, chatId, botToken);
      let words = s.blacklisted_words;
      const word = args.slice(1).join(" ").toLowerCase().trim();
      if (sub === "add" && word) {
        if (!words.includes(word)) words = [...words, word];
        await saveSettings(supabase, chatId, botToken, { blacklisted_words: words });
        await say(`🚫 "${word}" ban word list me add!`);
      } else if ((sub === "del" || sub === "remove") && word) {
        await saveSettings(supabase, chatId, botToken, { blacklisted_words: words.filter((w) => w !== word) });
        await say(`✅ "${word}" hata diya!`);
      } else if (sub === "list") {
        await say(words.length ? `🚫 *Badwords (${words.length}):*\n${words.join(", ")}\n\n${MAX_WARNS} warns = auto kick` : "Koi badword set nahi hai.");
      } else if (sub === "clear") {
        await saveSettings(supabase, chatId, botToken, { blacklisted_words: [] });
        await say("🧹 Saare badwords clear!");
      } else {
        await say("⚠️ Use: /badword add <word> | del <word> | list | clear");
      }
      return true;
    }

    case "/promote": {
      const t = await needTarget(); if (!t) return true;
      const r = await tg(botToken, "promoteChatMember", {
        chat_id: chatId, user_id: t.id,
        can_delete_messages: true, can_restrict_members: true, can_pin_messages: true,
        can_invite_users: true, can_manage_video_chats: true,
      });
      adminCache.delete(`${botToken}:${chatId}:${t.id}`);
      await say(r.ok ? `👑 *${t.name}* ab admin hai!` : `⚠️ Promote fail — bot ko "Add admins" right chahiye.`);
      return true;
    }

    case "/demote": {
      const t = await needTarget(); if (!t) return true;
      const r = await tg(botToken, "promoteChatMember", {
        chat_id: chatId, user_id: t.id,
        can_manage_chat: false, can_delete_messages: false, can_restrict_members: false, can_pin_messages: false,
        can_invite_users: false, can_promote_members: false, can_change_info: false, can_manage_video_chats: false,
        can_post_messages: false, can_edit_messages: false,
      });
      adminCache.delete(`${botToken}:${chatId}:${t.id}`);
      await say(r.ok ? `⬇️ *${t.name}* ke admin rights le liye.` : "⚠️ Demote fail (sirf wahi demote ho sakte hain jinhe bot ne promote kiya).");
      return true;
    }
  }
  return false;
}
