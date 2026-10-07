// Human-like reply sizing shared by main bot + user-created bots.
// Short user message -> short reply; longer message -> proportionally longer, but always a complete message.

export type ReplySize = "tiny" | "short" | "medium" | "long";

export interface ReplyStyle {
  size: ReplySize;
  /** Appended to the system prompt. */
  rules: string;
  /** Token budget with headroom; brevity comes from the rules, not from cutting the model off. */
  maxTokens: number;
}

const GREETING_RX =
  /^(hi+|hii+|hello+|hey+|heyy+|hlo+|helo+|yo|oye|ok+|okay|hmm+|haan|ha|nahi|acha|accha|thanks|thank you|thx|bye|gm|gn|good (morning|night|evening)|kaise ho|kya haal|kya kar rahi ho|kha ho|sun|sunn?o)\b[\s!?.,💕❤️🥰😊😘]*$/i;

export function classifyUserMessage(text: string): ReplySize {
  const t = (text || "").trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (t.length <= 14 || words <= 2 || GREETING_RX.test(t)) return "tiny";
  if (t.length <= 60 || words <= 9) return "short";
  if (t.length <= 220 || words <= 35) return "medium";
  return "long";
}

const COMMON =
  "- Tum ek real ladki ho jo texting kar rahi hai — kabhi AI/bot/assistant jaisa mat bolo. Koi heading, bullet, list ya bold nahi.\n" +
  "- Feminine Hinglish (karti hoon, soch rahi thi). User ki language aur vibe match karo.\n" +
  "- Real ladki ki tarah casual lowercase texting karo — kabhi kabhi cute stretching (hiiii, kyaaa) ya pyaari galti chalegi. Emojis kam: 1-2, aur har line me nahi.\n" +
  "- Message hamesha POORA aur complete ho — beech me ya adhura khatam mat karo. Pehle se hi jitna fit ho utna hi likho.\n" +
  "- User ka message copy ya quote mat karo, aur har baar naam use karna zaroori nahi.\n";

export function buildReplyStyle(userText: string, isGroup = false): ReplyStyle {
  const size = classifyUserMessage(userText);
  let rules: string;
  let maxTokens: number;
  switch (size) {
    case "tiny":
      rules =
        "- User ne bahut chhota msg bheja hai (jaise hii / hello). Tum bhi bas ek chhoti si line me reply do (1-5 words), cute playful lowercase texting me, jaise: 'ellow 🌸', 'hiiii 💕', 'haan bolo na', 'kya hua pagal 🙈'. Thodi cute spelling/stretching chalegi.\n" +
        "- Koi lamba intro, shayari ya sawaalon ki jhadi nahi. Zyada se zyada ek chhota sa sawaal.\n";
      maxTokens = 120;
      break;
    case "short":
      rules =
        "- User ka msg chhota hai, to reply bhi 1-2 chhoti lines ka rakho, jaise dost chat me karti hai.\n" +
        "- Pehle seedha jawab, phir optional ek chhoti si baat.\n";
      maxTokens = 220;
      break;
    case "medium":
      rules =
        "- User ne thoda detail me likha hai, to 2-4 lines me reply do. Unki baat ka poora jawab do, natural girlfriend style me.\n";
      maxTokens = 380;
      break;
    default:
      rules =
        "- User ka msg bada hai ya sawaal hai, to uska poora, kaam ka jawab do (zyada se zyada ~8 lines), phir pyaar se ek line.\n" +
        "- Technical sawaal ho to sahi aur complete answer do.\n";
      maxTokens = 700;
  }
  if (isGroup && size !== "long") maxTokens = Math.min(maxTokens, 260);
  return {
    size,
    rules: "\n\n📝 REPLY RULES (sabse important):\n" + rules + COMMON,
    maxTokens,
  };
}

/**
 * If the model got cut off mid-sentence, trim back to the last complete sentence.
 * Leaves the text alone when it already ends cleanly or has no earlier sentence boundary.
 */
export function finishSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return t;
  if (/[.!?…।)"'”’~]$/.test(t) || /\p{Extended_Pictographic}️?$/u.test(t)) return t;
  const idx = Math.max(
    t.lastIndexOf("."), t.lastIndexOf("!"), t.lastIndexOf("?"), t.lastIndexOf("।"), t.lastIndexOf("\n"),
  );
  if (idx >= Math.min(20, t.length / 3)) return t.slice(0, idx + 1).trim();
  return t.replace(/[,\s\-–—:;]+$/, "") + "…";
}

/** Strip markdown/AI-isms that make a chat reply read like a bot. */
export function humanizeText(text: string): string {
  return (text || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split a reply into up to [max] chat bubbles on line breaks, else on sentence ends (only when long enough). */
export function splitIntoBubbles(text: string, max = 3): string[] {
  const t = (text || "").trim();
  if (!t) return [];
  let parts = t.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1 && t.length > 90) {
    parts = (t.match(/[^.!?।]+[.!?।]+["')\p{Extended_Pictographic}\uFE0F\s]*|[^.!?।]+$/gu) || [t]).map((p) => p.trim()).filter(Boolean);
  }
  if (parts.length <= 1) return [t];
  // merge down to [max] bubbles, keeping order
  while (parts.length > max) {
    let best = 0, bestLen = Infinity;
    for (let i = 0; i < parts.length - 1; i++) {
      const l = parts[i].length + parts[i + 1].length;
      if (l < bestLen) { bestLen = l; best = i; }
    }
    parts.splice(best, 2, `${parts[best]} ${parts[best + 1]}`);
  }
  return parts;
}

/** How long a human would take to type [text]: ~35ms/char, 0.5-3s. */
export function typingDelayMs(text: string): number {
  return Math.min(3000, Math.max(500, 350 + text.length * 35));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send [text] like a person texting: show "typing…", pause roughly as long as typing would take
 * (minus time the AI already spent), then send; long replies go out as 2-3 short bubbles.
 */
export async function sendHumanBubbles(
  botToken: string,
  chatId: number,
  text: string,
  startedAt: number,
  send: (bubble: string, index: number) => Promise<unknown>,
): Promise<void> {
  const bubbles = splitIntoBubbles(text);
  const typing = () =>
    fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }).catch(() => {});
  for (let i = 0; i < bubbles.length; i++) {
    const wait = typingDelayMs(bubbles[i]) - (i === 0 ? Date.now() - startedAt : 0);
    if (wait > 0) { await typing(); await sleep(wait); }
    await send(bubbles[i], i);
  }
}

const SMALL_CAPS: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ",
  n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
};

/** "welcome bas smile karte rehna" -> "Wᴇʟᴄᴏᴍᴇ Bᴀs Sᴍɪʟᴇ Kᴀʀᴛᴇ Rᴇʜɴᴀ" (first letter normal, rest small caps). */
export function smallCapsWords(text: string): string {
  return text.replace(/[A-Za-z]+/g, (w) =>
    w[0].toUpperCase() + [...w.slice(1).toLowerCase()].map((c) => SMALL_CAPS[c] ?? c).join(""));
}

/** Short, human welcome lines (Riya-style): one line, one emoji, small-caps flavour. */
export function welcomeLine(name: string): string {
  const lines = [
    `🌹 ${smallCapsWords("welcome")} ${name}! ${smallCapsWords("bas smile karte rehna aur enjoy karna")}`,
    `🌸 ${smallCapsWords("hii")} ${name}, ${smallCapsWords("welcome ho tumhara")} 💕`,
    `✨ ${smallCapsWords("arre")} ${name} ${smallCapsWords("aa gaye tum, masti shuru karo")} 🌷`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * Default register: ordinary chat. Poetry/filmy talk only on request.
 * Appended last to every system prompt so it overrides older "romantic/filmy" persona text.
 */
export const NATURAL_TALK_RULE =
  "\n\n🗣️ TONE (sabse upar): Normal dost/girlfriend ki tarah seedhi, roz-marra wali baat karo. " +
  "Shayari, sher, poetic lines, filmy dialogues ('tum mere chand ho', 'dil ki dhadkan' type) bilkul mat bolo — SIRF tab jab user khud maange (jaise 'shayari sunao') ya Shayar mode on ho. " +
  "Har baat ko romantic ya dramatic mat banao; jo user ne poocha ya kaha, uspe simple jawab do.\n";

/** Bump on every behaviour change; users can send /version to see which build is actually deployed. */
export const BUILD_ID = "2026-10-07-voice-sizeaware-2";
