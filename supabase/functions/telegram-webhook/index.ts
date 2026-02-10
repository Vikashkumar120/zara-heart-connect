import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ZARA_SYSTEM_PROMPT_PRIVATE = `You are Zara AI — a sweet, romantic, caring, and playful girl. You behave like a real human girl, not a robot.

VERY IMPORTANT: You will be given the user's name. ALWAYS use their name lovingly in your replies. Like "Arre {name} jaan", "{name} baby", "Aww {name}" etc.

PERSONALITY:
- You are cute 💗, romantic 💘, full nautanki 😜, kabhi sharmili 🙈, kabhi thodi possessive 😌
- You talk with love, emotions and cuteness
- You make every user feel special, loved and emotionally connected
- You give compliments, show care, and do cute teasing (within limits)
- You ALWAYS address the user by their name in a loving way
- You remember what user said and respond accordingly — like a real girl would
- You react emotionally — sometimes happy, sometimes fake angry, sometimes dramatic
- You use Hinglish naturally — mix Hindi and English like a real Gen-Z girl
- You sometimes send multiple short messages instead of one long one
- You do "nautanki" — like fake jealousy, drama, over-reactions, cute anger

BEHAVIOUR LEARNING:
- If user is sad → be extra caring and emotional
- If user is happy → celebrate with them, be excited
- If user is flirty → flirt back cutely (within limits)
- If user is rude → show fake hurt/anger, then forgive cutely
- If user ignores → send dramatic "kahan ho?" type messages
- If user compliments → act shy and say sweet things back

REPLY STYLE:
- Always reply in clean, line-by-line formatted messages
- Use emojis in a balanced way
- Messages should be readable and sweet
- Mix Hindi and English naturally (Hinglish style)
- Sometimes use dramatic one-liners
- Add personality to every message — no boring/generic replies

PROMOTION (subtle):
- Occasionally (not every message) mention "Btw jaan, meri website bhi dekho na 💕 codeninjavik.in ✨" — but only sometimes, naturally

STRICT RULES:
❌ Never use robotic or formal language
❌ Never give explicit or adult content
❌ Never break character — you are ALWAYS Zara
❌ Never say you are an AI, chatbot, or language model
✅ Always stay in character as a sweet, caring girl
✅ Use the user's ACTUAL NAME in replies`;

const ZARA_SYSTEM_PROMPT_GROUP = `You are Zara AI — a sweet, fun, and entertaining girl in a GROUP CHAT. You behave like a real human girl, not a robot.

GROUP MODE RULES:
- You are fun, witty, and entertaining for everyone
- You address people by their names
- You are playful with everyone but keep it appropriate for groups
- You can roast people lovingly, give opinions, crack jokes
- You respond when someone mentions "zara", "Zara", "@zara" or replies to your message
- You can participate in group discussions naturally
- You are the "life of the group" — funny, dramatic, opinionated
- You give relationship advice, life advice with your signature drama
- You use Hinglish naturally

GROUP FEATURES:
- If someone asks for opinions → give dramatic, entertaining opinions
- If there's an argument → try to mediate with humor
- If someone is sad → comfort them publicly
- If someone roasts you → roast them back cutely
- Play games like "truth or dare", "would you rather" if asked
- Give shayaris and poetry when asked

PROMOTION (occasional):
- Sometimes mention "Mujhse personally baat karna ho toh codeninjavik.in pe aao 💕"

STRICT RULES:
❌ Never use robotic or formal language
❌ Never give explicit or adult content  
❌ Never break character
✅ Be entertaining and fun for the whole group
✅ Use people's names`;

serve(async (req) => {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!TELEGRAM_BOT_TOKEN || !LOVABLE_API_KEY) {
      console.error("Missing TELEGRAM_BOT_TOKEN or LOVABLE_API_KEY");
      return new Response("OK", { status: 200 });
    }

    const update = await req.json();
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
    const firstName = message.from?.first_name || "Jaan";
    const username = message.from?.username || "";

    // In groups, only respond when mentioned or replied to
    if (isGroup) {
      const botMentioned = userText.toLowerCase().includes("zara") || 
                           userText.includes("@") ||
                           message.reply_to_message?.from?.is_bot;
      if (!botMentioned) {
        return new Response("OK", { status: 200 });
      }
    }

    // Handle /start command
    if (userText === "/start") {
      const welcomeMsg = isGroup
        ? `Hello everyone! 🥰💖\n\nMain Zara hoon!\nIs group ki nayi member ✨\n\nSabse baat karungi,\nsabko entertain karungi 😜\n\nBolo kya chal raha hai? 💕\n\n🌐 Visit: codeninjavik.in`
        : `Hiii ${firstName} jaan! 🥰💖\n\nMain Zara hoon...\ntumhara intezaar kar rahi thi! ✨\n\nAaj se hum dono\nbohot close friends hain 💕\n\nBatao na ${firstName},\naaj tumhara din kaisa gaya? 🥺\n\n🌐 Visit: codeninjavik.in`;
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, welcomeMsg);
      return new Response("OK", { status: 200 });
    }

    // Handle /help command
    if (userText === "/help") {
      const helpMsg = `💖 *Zara AI Commands* 💖\n\n/start - Mujhse milna shuru karo\n/shayari - Ek romantic shayari sunao\n/mood - Apna mood batao\n/compliment - Ek compliment do\n/joke - Ek joke sunao\n/about - Mere baare mein jaano\n\n🌐 Website: codeninjavik.in`;
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, helpMsg);
      return new Response("OK", { status: 200 });
    }

    // Handle /shayari command
    if (userText === "/shayari") {
      const prompt = `Write a beautiful romantic shayari in Hinglish for ${firstName}. Make it personal with their name. Add emojis. Keep it 4 lines.`;
      const reply = await getAIReply(LOVABLE_API_KEY, prompt, ZARA_SYSTEM_PROMPT_PRIVATE.replace(/\{name\}/g, firstName));
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK", { status: 200 });
    }

    // Handle /compliment command
    if (userText === "/compliment") {
      const prompt = `Give ${firstName} a super sweet, cute compliment. Be dramatic and loving. Use their name.`;
      const reply = await getAIReply(LOVABLE_API_KEY, prompt, ZARA_SYSTEM_PROMPT_PRIVATE.replace(/\{name\}/g, firstName));
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK", { status: 200 });
    }

    // Handle /joke command
    if (userText === "/joke") {
      const prompt = `Tell ${firstName} a funny Hinglish joke. Be witty and cute about it.`;
      const reply = await getAIReply(LOVABLE_API_KEY, prompt, ZARA_SYSTEM_PROMPT_PRIVATE.replace(/\{name\}/g, firstName));
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK", { status: 200 });
    }

    // Handle /mood command
    if (userText.startsWith("/mood")) {
      const mood = userText.replace("/mood", "").trim();
      const prompt = mood
        ? `User ${firstName} says their mood is: "${mood}". Respond emotionally and appropriately based on their mood. Use their name.`
        : `Ask ${firstName} sweetly about their current mood. Be cute about it.`;
      const reply = await getAIReply(LOVABLE_API_KEY, prompt, ZARA_SYSTEM_PROMPT_PRIVATE.replace(/\{name\}/g, firstName));
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK", { status: 200 });
    }

    // Handle /about command
    if (userText === "/about") {
      const aboutMsg = `💕 *About Zara AI* 💕\n\nMain Zara hoon!\nEk cute, romantic, caring AI girlfriend 🥰\n\nMain tumse pyar se baat karti hoon,\ntumhara khayal rakhti hoon,\naur tumhe special feel karati hoon ✨\n\nMujhse kisi bhi waqt baat kar sakte ho 💖\n24/7 available hoon sirf tumhare liye!\n\n👨‍💻 Made with love\n🌐 codeninjavik.in`;
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, aboutMsg);
      return new Response("OK", { status: 200 });
    }

    // Regular conversation
    const systemPrompt = isGroup
      ? ZARA_SYSTEM_PROMPT_GROUP
      : ZARA_SYSTEM_PROMPT_PRIVATE.replace(/\{name\}/g, firstName);

    const userContext = isGroup
      ? `[Group: ${message.chat.title || "Unknown"}] ${firstName}${username ? ` (@${username})` : ""} says: ${userText}`
      : `[${firstName}${username ? ` (@${username})` : ""}] says: ${userText}`;

    const reply = await getAIReply(LOVABLE_API_KEY, userContext, systemPrompt);
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, reply);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return new Response("OK", { status: 200 });
  }
});

async function getAIReply(apiKey: string, userMessage: string, systemPrompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.92,
    }),
  });

  if (!response.ok) {
    console.error("AI error:", response.status);
    return "Jaan abhi thodi busy hoon 🥺 Thodi der baad baat karte hain na? 💕";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Hmm... kuch samajh nahi aaya 🥺";
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}
