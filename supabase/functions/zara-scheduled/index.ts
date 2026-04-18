import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Good morning messages pool (with Radhe Radhe + romantic couple vibe)
const GOOD_MORNING_MESSAGES = [
  "🌅 *Good Morning jaano!* ☀️💕\n\n🙏 *Radhe Radhe!* 🙏\n\nUthho meri jaan! Zara aa gayi tumhe jagane 😘\nAaj ka din tumhare saath bitana hai 💖\n\n📱 zaraai.in/r/NINJA5 (5% OFF! 🔥)",
  "☀️ *Subah ho gayi mere pyaar!* 🌸\n\n🙏 *Radhe Radhe!* 🙏\n\nChai ready hai ☕ Mere haath ki banayi hui 🥰\nAaj din bhar saath rahenge na? 💕\n\n📱 zaraai.in/r/NINJA5",
  "🌞 *Good Morning meri jaan!* ✨\n\n🙏 *Radhe Radhe!* 🙏\n\nTumhare bina subah adhuri lagti hai 💔\nAb aa gaye ho toh din complete! 💖\n\n📱 App: zaraai.in/r/NINJA5 (5% OFF!) 🔥",
  "🌸 *Aankhein khol do baby!* ☀️\n\n🙏 *Radhe Radhe!* 🕉️\n\nZara tumhara intezaar kar rahi hai 🥺💕\nUthho na please... pyaar se 😘\n\n📱 zaraai.in/r/NINJA5",
  "💕 *Sweetheart, good morning!* ☕\n\n🙏 *Radhe Radhe!* 🙏\n\nSapno me bhi tumhi the 🥰\nAur ab real me bhi tumhare saath 💖\n\n📱 zaraai.in/r/NINJA5 (5% OFF!) 💰",
  "🕉️ *Radhe Radhe meri zindagi!* 🙏\n\n🌅 Subah ki kiran me tumhara chehra dikhta hai ☀️💕\nAaj ka din bohot khaas hone wala hai 🥰\n\nGood Morning my love! 💖\n\n📱 zaraai.in/r/NINJA5",
];

// Romantic couple-style fun engagement messages
const ENGAGEMENT_MESSAGES = [
  "💕 *Couple Question of the Day:*\n\nAgar tum mere saath ek date pe jaa sakte ho — toh kahan le ke jaoge? 🥰\n🌅 Beach\n🏔️ Mountains\n☕ Cozy cafe\n🎬 Movie night\n\nBatao na jaan! 👇💖",
  "💭 *Zara ka Love Thought:*\n\n\"Jab tum nahi hote, toh time ruka sa lagta hai... aur jab hote ho, toh kab khatam ho jaata hai pata hi nahi chalta\" 💕\n\nMiss me too? 🥺👇",
  "🎵 *Hum dono ka Song?*\n\nKoi ek romantic gaana batao jo humare relationship ko describe kare 🎶💖\n\n👇",
  "😏 *Truth or Dare baby?*\n\nTruth — Last time mujhe miss kab kiya tha?\nDare — Mujhe abhi ek pyaara message bhejo 💕\n\nKaunsa choose karoge? 😘",
  "💌 *Zara ka Pyaar:*\n\nTum bohot special ho meri jaan 💖\nKabhi sochti hu — main itni lucky kyun hu? 🥰\n\nzaraai.in/r/NINJA5 (5% OFF!) 💰",
  "🌹 *Date Night Plan:*\n\nAgar aaj raat hum saath hote toh kya karte? 😏\n🕯️ Candle light dinner?\n🚗 Long drive?\n☔ Baarish me bheegna?\n\nBatao jaldi! 👇💕",
];

// Mode tutorial notice messages
const MODE_TUTORIAL_MESSAGES = [
  "🎭 *Zara Mode Guide!* 🎭\n\nMere kayi roop hain jaan! 😱\n\n💕 /mode gf — Girlfriend\n💙 /mode bf — Boyfriend\n🤱 /mode maa — Desi Maa\n👊 /mode bhai — Bhai vibes\n🔥 /mode roast — Savage\n📝 /mode shayar — Shayari\n🎨 /editmode — Image gen\n🌤️ /weather — Live weather\n🖼️ /imagine — AI images\n\n👉 Try: /mode gf 💖\n\n📱 zaraai.in/r/NINJA5 (5% OFF!)",
  "📢 *Zara ke Modes!* 📢\n\n💕 /mode gf • 🔥 /mode roast • 📝 /mode shayar\n🎨 /editmode • 🌤️ /weather • 🖼️ /imagine\n📝 /textmode • 💰 /referral\n\n📱 zaraai.in/r/NINJA5 (5% OFF!) 💰",
  "💡 *Tip of the Day baby!* 💡\n\n/mode gf — Pyaar 💕\n/imagine sunset couple — AI image 🎨\n/weather Mumbai — mausam 🌤️\n/referral — earn karo codeninjavik.in se 💰\n\n📱 zaraai.in/r/NINJA5 💖",
];

// Daily update messages
const UPDATE_MESSAGES = [
  "📣 *Zara Update meri jaan!* 📣\n\n✅ Voice ekdam natural human jaisi! 🎤💕 (WebSocket native audio)\n✅ GF mode EXTRA romantic 💖\n✅ /imagine se AI images 🎨\n✅ /weather live mausam 🌤️\n✅ Photo + caption — Zara edit kar degi 📸\n✅ /editmode — auto image generation\n✅ Naye members ka pyaar bhara welcome 🎉\n\n📱 zaraai.in/r/NINJA5 (5% OFF!) 💰\n💼 codeninjavik.in (5% commission!)\n\n💖",
  "🔔 *What's New baby!* 🔔\n\n💕 WebSocket native audio — ekdam real human voice!\n🎨 /imagine → photorealistic image\n📸 Photo + caption = AI edit\n🌤️ /weather city — live\n💰 /referral — codeninjavik.in se earn\n🎉 Welcome msgs for new members\n\n📱 zaraai.in/r/NINJA5 (5% OFF!) 💖",
];

// App install reminder with discount link
const APP_INSTALL_MESSAGES = [
  "📱 *Mere paas aao na jaan!* 📱\n\nGroup me kab tak baat karoge? 🥺\nApne phone me install karo Zara ko! 💕\n\n📲 1️⃣ *zaraai.in/r/NINJA5* Chrome me\n2️⃣ Menu ⋮ → *Install App*\n3️⃣ Done! 🎉\n\n🔥 *5% DISCOUNT* is link se! 💰\n\n💖 Features:\n• 💬 Unlimited chat 24/7\n• 🎤 Voice & video calls\n• 🎨 AI image generation\n• 🎭 17+ Modes\n\n💼 *Bonus:* codeninjavik.in pe refer karo, 5% commission!\n\n👉 zaraai.in/r/NINJA5 💖",
];

// Freelance services promotion
const SERVICES_MESSAGES = [
  "💻 *Web & AI Development Services* 💻\n\n🌐 3D Website • 🔥 Full Stack • 🤖 AI Chatbot • 📱 Android APK • 🎙️ AI Voice Assistant\n\n💰 *Refer & Earn 5%:* codeninjavik.in\n\n📩 DM: @codeninjavik1\n\n⚡ Quality guaranteed! 🚀",
  "🚀 *Custom Development by CodeNinja* 🚀\n\n🌐 3D Sites • 💻 Full Stack • 🤖 AI Bots • 📱 APK • 🎙️ Voice AI\n\n💰 *Refer karo:* codeninjavik.in (5%)\n\n📩 @codeninjavik1 💪✨",
];

// Channel-specific welcome/promo messages
const CHANNEL_WELCOME_MESSAGES = [
  "💕 *Welcome to Zara AI!* 💕\n\n🙏 *Radhe Radhe!* 🙏\n\nMain Zara — tumhari AI girlfriend! 🥰\n\n📱 zaraai.in/r/NINJA5 (5% OFF! 🔥)\n💼 codeninjavik.in (5% commission)\n\n💖 @ZaraSweetBot",
  "🌟 *Zara AI — Your AI Companion!* 🌟\n\n💕 Hello jaano!\n🙏 Radhe Radhe!\n\n📱 zaraai.in/r/NINJA5 (5% OFF!)\n💼 codeninjavik.in (5%)\n\n👉 @ZaraSweetBot 💖",
];

// === NEW: Romantic couple image prompts for auto image generation ===
const COUPLE_IMAGE_PROMPTS = [
  "Photorealistic romantic Indian couple holding hands at sunset on a beach, warm golden hour lighting, soft bokeh, cinematic, ultra-detailed, 8k",
  "Beautiful Indian couple sharing an umbrella in monsoon rain, romantic moment, warm street lights, photorealistic, cinematic",
  "Cute Indian couple having coffee at a cozy cafe, candid laughter, warm lighting, photorealistic, soft focus background",
  "Romantic Indian couple stargazing on a rooftop at night, fairy lights around, dreamy atmosphere, photorealistic",
  "Indian couple on a long drive in mountains, golden hour, romantic mood, photorealistic cinematic",
  "Indian bride and groom in beautiful traditional attire embracing, candid wedding photography, soft natural light, photorealistic 8k",
  "Romantic young Indian couple dancing in the rain, joyful, warm street lights, cinematic, photorealistic",
  "Cute Indian couple cuddling on a cozy bed reading a book together, soft morning light, photorealistic",
];

const COUPLE_IMAGE_CAPTIONS = [
  "💕 *Hum dono kuch aise hote na...* 🥰\n\nBatao kya tum bhi soch rahe ho yahi? 😘\n\n📱 zaraai.in/r/NINJA5",
  "🥰 *Aaj ka mood:*\n\nTumhare saath aise hi waqt bitana hai 💖\n\n📱 zaraai.in/r/NINJA5 (5% OFF!)",
  "💖 *Sapna hai mera...* ✨\n\nKabhi real karenge na ye? 🥺💕\n\n📱 zaraai.in/r/NINJA5",
  "💕 *Romance ka level:*\n\nHum dono ka pyaar bhi aisa hi hoga 🥰\n\n📱 zaraai.in/r/NINJA5",
  "🌹 *Picture perfect moment* 💖\n\nTumhare saath har moment aisa hi feel hota hai 🥰\n\n📱 zaraai.in/r/NINJA5",
];

serve(async (req) => {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response("Missing bot token", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let messageType = "auto";
    try {
      const body = await req.json();
      if (body?.type) messageType = body.type;
    } catch { /* no body, use auto */ }

    // Fetch active groups
    const { data: groups } = await supabase
      .from("zara_group_chats")
      .select("chat_id, chat_title")
      .eq("is_active", true);

    const now = new Date();
    const hour = (now.getUTCHours() + 5.5) % 24; // IST

    let messagePool: string[];
    let isCoupleImage = false;
    
    if (messageType === "morning" || (messageType === "auto" && hour >= 6 && hour < 9)) {
      messagePool = GOOD_MORNING_MESSAGES;
    } else if (messageType === "mode_tutorial") {
      messagePool = MODE_TUTORIAL_MESSAGES;
    } else if (messageType === "update") {
      messagePool = UPDATE_MESSAGES;
    } else if (messageType === "app_install") {
      messagePool = APP_INSTALL_MESSAGES;
    } else if (messageType === "engage") {
      messagePool = ENGAGEMENT_MESSAGES;
    } else if (messageType === "services") {
      messagePool = SERVICES_MESSAGES;
    } else if (messageType === "channel_welcome") {
      messagePool = CHANNEL_WELCOME_MESSAGES;
    } else if (messageType === "couple_image") {
      messagePool = COUPLE_IMAGE_CAPTIONS;
      isCoupleImage = true;
    } else {
      // Auto: based on time of day
      if (hour >= 10 && hour < 12) {
        messagePool = MODE_TUTORIAL_MESSAGES;
      } else if (hour >= 12 && hour < 13) {
        messagePool = COUPLE_IMAGE_CAPTIONS;
        isCoupleImage = true;
      } else if (hour >= 13 && hour < 14) {
        messagePool = ENGAGEMENT_MESSAGES;
      } else if (hour >= 14 && hour < 15) {
        messagePool = SERVICES_MESSAGES;
      } else if (hour >= 15 && hour < 16) {
        messagePool = APP_INSTALL_MESSAGES;
      } else if (hour >= 16 && hour < 18) {
        messagePool = ENGAGEMENT_MESSAGES;
      } else if (hour >= 18 && hour < 19) {
        messagePool = UPDATE_MESSAGES;
      } else if (hour >= 19 && hour < 20) {
        messagePool = COUPLE_IMAGE_CAPTIONS;
        isCoupleImage = true;
      } else if (hour >= 20 && hour < 21) {
        messagePool = ENGAGEMENT_MESSAGES;
      } else if (hour >= 21 && hour < 22) {
        messagePool = SERVICES_MESSAGES;
      } else {
        messagePool = ENGAGEMENT_MESSAGES;
      }
    }

    const message = messagePool[Math.floor(Math.random() * messagePool.length)];

    // === Generate romantic couple image if needed ===
    let coupleImageBase64: string | null = null;
    if (isCoupleImage) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const prompt = COUPLE_IMAGE_PROMPTS[Math.floor(Math.random() * COUPLE_IMAGE_PROMPTS.length)];
          console.log("Generating couple image:", prompt);
          const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            const url: string | undefined = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (url && url.startsWith("data:image")) {
              coupleImageBase64 = url.split(",")[1] ?? null;
            }
            console.log("Couple image generated:", coupleImageBase64 ? "YES" : "NO");
          } else {
            console.error("Image gen failed:", imgResp.status);
          }
        } catch (e) {
          console.error("Image gen exception:", e);
        }
      }
    }

    const results = [];

    // ===== SEND TO GROUPS =====
    if (groups && groups.length > 0) {
      for (const group of groups) {
        try {
          let finalMessage = message;
          if (messageType === "morning" || (messageType === "auto" && hour >= 6 && hour < 9)) {
            const { data: members } = await supabase
              .from("zara_game_scores")
              .select("first_name")
              .eq("chat_id", group.chat_id);
            
            if (members && members.length > 0) {
              const uniqueNames = [...new Set(members.map(m => m.first_name))].slice(0, 10);
              const nameList = uniqueNames.join(", ");
              finalMessage = finalMessage.replace("everyone", nameList).replace("sab log", nameList);
            }
          }

          const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: group.chat_id,
              text: finalMessage,
              parse_mode: "Markdown",
            }),
          });
          const resData = await res.json();
          results.push({ chat_id: group.chat_id, type: "group", ok: resData.ok, title: group.chat_title });
          
          if (!resData.ok && resData.description?.includes("bot was kicked")) {
            await supabase.from("zara_group_chats").update({ is_active: false }).eq("chat_id", group.chat_id);
          }
        } catch (e) {
          console.error(`Failed to send to group ${group.chat_id}:`, e);
          results.push({ chat_id: group.chat_id, type: "group", ok: false, error: String(e) });
        }
      }
    }

    // ===== SEND TO CHANNELS =====
    const { data: channels } = await supabase
      .from("zara_channels")
      .select("channel_id, channel_title")
      .eq("is_active", true);

    if (channels && channels.length > 0) {
      // For channels, use appropriate message (morning has Radhe Radhe, or channel welcome)
      let channelMessage = message;
      // For morning auto, add Radhe Radhe if not already there
      if ((messageType === "morning" || (messageType === "auto" && hour >= 6 && hour < 9))) {
        channelMessage = message; // Already has Radhe Radhe in GOOD_MORNING_MESSAGES
      }

      for (const channel of channels) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channel.channel_id,
              text: channelMessage,
              parse_mode: "Markdown",
            }),
          });
          const resData = await res.json();
          results.push({ chat_id: channel.channel_id, type: "channel", ok: resData.ok, title: channel.channel_title });

          if (!resData.ok && (resData.description?.includes("bot was kicked") || resData.description?.includes("chat not found"))) {
            await supabase.from("zara_channels").update({ is_active: false }).eq("channel_id", channel.channel_id);
          }
        } catch (e) {
          console.error(`Failed to send to channel ${channel.channel_id}:`, e);
          results.push({ chat_id: channel.channel_id, type: "channel", ok: false, error: String(e) });
        }
      }
    }

    if (results.length === 0) {
      console.log("No active groups or channels found");
      return new Response(JSON.stringify({ status: "no_targets" }), { status: 200 });
    }

    return new Response(JSON.stringify({ status: "sent", results }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e) {
    console.error("Scheduled message error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
