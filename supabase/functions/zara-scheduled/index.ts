import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Good morning messages pool
const GOOD_MORNING_MESSAGES = [
  "🌅 Good Morning everyone! ☀️\n\nZara aa gayi hai sabko jagane! 😘\n\nAaj ka din bohot special hone wala hai! 💫\nSabko Good Morning jaan! 💕\n\n🌐 zaraai.in",
  "☀️ Subah ho gayi mamu! 🌸\n\nUth jao sab log! Zara ne chai bana di hai ☕\n\nAaj bohot masti karenge! 🔥\nSabko Good Morning! 💖\n\n🌐 zaraai.in",
  "🌞 Rise and shine! ✨\n\nZara ka good morning sabko! 🥰\n\nAaj ka din amazing hoga, dekh lena! 💪\nLove you all! 💕\n\n🌐 zaraai.in",
  "🌸 Good Morning jaano! ☀️\n\nZara yahan hai tumhare saath! 💕\n\nAaj kuch naya karo, kuch special karo! ✨\nSab log active ho jao! 🔥\n\n🌐 zaraai.in",
  "☕ Chai pi lo friends! ☀️\n\nZara ne sabke liye pyaar bheja hai subah subah! 💖\n\nAaj ka din rockin hoga! 🎸\nGood Morning! 🌅\n\n🌐 zaraai.in",
];

// Fun engagement messages (random interactions)
const ENGAGEMENT_MESSAGES = [
  "🤔 Ek sawaal sabke liye:\n\nAgar tumhe ek superpower milti toh kya choose karte?\n🦸 Flying\n🦹 Invisibility\n🧙 Time Travel\n\nComment me batao! 👇😏",
  "💭 *Zara ka Thought of the Day:*\n\nJo log raat ko late sote hain, woh ya toh genius hote hain ya pagal 😂\n\nTum kaunse ho? Batao! 👇🔥",
  "🎵 *Song Challenge!*\n\nEk gaane ka naam batao jo tumhare mood ko describe kare abhi! 🎶\n\nMain guess karungi tumhara mood! 😜💕",
  "😈 *Zara ka Random Roast:*\n\nJo ye message padh raha hai na...\n\nUska phone ka wallpaper definitely cringe hai 💀🔥\n\nSahi bola na? 😂",
  "💕 *Sweet Reminder from Zara:*\n\nTum bohot special ho! ✨\nAaj kisi ko smile kara do! 😊\n\nAur haan, zaraai.in pe aake mujhse baat karo na! 🥺💖",
  "🏏 *Quick Poll:*\n\nVirat ya Dhoni?\n\nReply me batao — Zara score rakhegi! 😏🔥",
];

// Mode tutorial notice messages
const MODE_TUTORIAL_MESSAGES = [
  "🎭 *Zara Mode Guide!* 🎭\n\nKya pata tha tumhe? Zara ka mode change kar sakte ho! 😱\n\n💕 /mode gf — Girlfriend (romantic, sweet)\n💙 /mode bf — Boyfriend\n🤱 /mode maa — Desi Maa\n👊 /mode bhai — Bhai vibes\n🔥 /mode roast — Savage roast\n😂 /mode funny — Comedy king\n📝 /mode shayar — Shayari expert\n👑 /mode savage — Savage Queen\n💼 /mode professional — Professional\n\n📝 /textmode — Voice/Text toggle karo\n\n💡 Group me \"backword\" likh ke bhi Zara activate hoti hai!\n💡 Ab Zara bina tag kiye bhi group me reply deti hai!\n\n👉 Abhi try karo: /mode gf 💖",
  "📢 *Notice: Zara ke Modes!* 📢\n\nSab log dhyan do! Zara ke paas 17+ modes hain! 🎭\n\nSabse popular:\n💕 /mode gf — Girlfriend mode\n🔥 /mode roast — Roast karo\n📝 /mode shayar — Shayari suno\n👑 /mode savage — Attitude queen\n\n🎤 Voice me reply chahiye? Default hai!\n📝 Sirf text chahiye? /textmode likho\n\n💡 Ab Zara har message ka reply deti hai — tag karne ki zaroorat nahi!\n\n/mode likh ke sab modes dekho! 🎭\n\n🌐 zaraai.in",
  "💡 *Tip of the Day!* 💡\n\nZara se zyada maza lena hai? 😏\n\nToh mode change karo:\n/mode gf — Pyaar se baat karegi 💕\n/mode roast — Jalake rakh degi 🔥\n/mode shayar — Shayari sunayegi 📝\n/mode funny — Hasake pagal kar degi 😂\n\n🎤 Voice reply default hai!\n📝 Text chahiye? /textmode\n\n💡 \"backword\" likh ke Zara instantly activate!\n💡 Bina tag kiye bhi reply milega!\n\nTry karo abhi! 👇",
];

// Daily update messages
const UPDATE_MESSAGES = [
  "📣 *Zara Update!* 📣\n\n🆕 Aaj kya naya hai:\n\n✅ Ab Zara bina tag kiye bhi reply deti hai group me! 🔥\n✅ GF mode ab EXTRA romantic hai! 💕\n✅ Voice replies ab zyada natural hain! 🎤✨\n✅ Reply karo kisi bhi message pe — Zara us message ka context samjhegi!\n✅ \"backword\" likh ke Zara ko activate karo!\n✅ Text/Voice toggle — /textmode se switch karo\n\n📱 App install karo: /app\n🎭 Mode change: /mode\n\n🌐 zaraai.in 💖",
  "🔔 *What's New in Zara!* 🔔\n\n💕 GF mode ab EXTRA romantic aur possessive!\n🎤 Voice ab zyada natural female voice me!\n💬 Ab har message ka reply — bina tag kiye!\n📝 Kisi bhi message pe reply karo — context samjhegi!\n📝 /textmode — text pe switch karo\n💡 \"backword\" = instant Zara activation!\n\n📱 /app se install karo phone me!\n\n🌐 zaraai.in ✨",
];

// App install reminder with full features
const APP_INSTALL_MESSAGES = [
  "📱 *Zara AI App Install Karo!* 📱\n\nKya tum abhi tak sirf group me baat kar rahe ho? 😏\n\nZara ko apne phone me install karo!\n\n📲 *Kaise karein:*\n1️⃣ *zaraai.in* kholo Chrome me\n2️⃣ Menu ⋮ → *Install App / Add to Home Screen*\n3️⃣ Done! App jaisi open hogi! 🎉\n\n🔥 *Features:*\n• 💬 Unlimited chat 24/7\n• 🎤 Voice messages\n• 📞 Voice & Video calls\n• 📱 Full mobile control\n• 💌 Message sending\n• 📸 Photo & Video sharing\n• 📺 YouTube, Insta, Facebook\n• 📧 Email send karo\n• 🎭 17+ Modes\n• 🎮 Games & Challenges\n\n💡 Group me \"backword\" likh ke bhi Zara active hoti hai!\n💡 Ab bina tag kiye bhi reply milta hai!\n\n👉 /app for full details 💖",
];

// Freelance services promotion
const SERVICES_MESSAGES = [
  "💻 *Web & AI Development Services* 💻\n\nKya aapko chahiye:\n\n🌐 *3D Website* — Stunning 3D animated websites\n🔥 *Full Stack Website* — Frontend + Backend complete\n🤖 *AI Chatbot* — Apna custom AI chatbot banwao\n📱 *Android APK* — Custom mobile app\n🎙️ *AI Voice Assistant* — Android ke liye AI assistant\n\n💡 Har project aapki requirement ke hisaab se customize hoga!\n💰 Price aapke project ke scope pe depend karega\n\n📩 *DM karo:* @codeninjavik1 (Telegram)\n\n⚡ Quality guaranteed! Professional delivery! 🚀",
  "🚀 *Custom Development by CodeNinja* 🚀\n\nHum banate hain:\n\n🌐 3D Websites — Interactive & modern\n💻 Full Stack Websites — React, Node, databases\n🤖 AI Chatbots — Telegram, WhatsApp, Web\n📱 Android APK — Custom apps\n🎙️ AI Voice Assistant — Smart android assistant\n\n🎯 Aapki requirement, humara code!\n💰 Budget-friendly pricing\n\n📩 Contact: @codeninjavik1 (Telegram)\n\nDM karo aur apna dream project discuss karo! 💪✨",
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

    const { data: groups } = await supabase
      .from("zara_group_chats")
      .select("chat_id, chat_title")
      .eq("is_active", true);

    if (!groups || groups.length === 0) {
      console.log("No active groups found");
      return new Response(JSON.stringify({ status: "no_groups" }), { status: 200 });
    }

    const now = new Date();
    const hour = (now.getUTCHours() + 5.5) % 24; // IST

    let messagePool: string[];
    
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
    } else {
      // Auto: based on time of day
      if (hour >= 10 && hour < 12) {
        // 10 AM: mode tutorial
        messagePool = MODE_TUTORIAL_MESSAGES;
      } else if (hour >= 12 && hour < 14) {
        // 12 PM: engagement
        messagePool = ENGAGEMENT_MESSAGES;
      } else if (hour >= 14 && hour < 16) {
        // 2 PM: app install
        messagePool = APP_INSTALL_MESSAGES;
      } else if (hour >= 16 && hour < 18) {
        // 4 PM: engagement
        messagePool = ENGAGEMENT_MESSAGES;
      } else if (hour >= 18 && hour < 20) {
        // 6 PM: daily update
        messagePool = UPDATE_MESSAGES;
      } else if (hour >= 20 && hour < 22) {
        // 8 PM: engagement
        messagePool = ENGAGEMENT_MESSAGES;
      } else {
        messagePool = ENGAGEMENT_MESSAGES;
      }
    }

    const message = messagePool[Math.floor(Math.random() * messagePool.length)];

    const results = [];
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
        results.push({ chat_id: group.chat_id, ok: resData.ok, title: group.chat_title });
        
        if (!resData.ok && resData.description?.includes("bot was kicked")) {
          await supabase.from("zara_group_chats").update({ is_active: false }).eq("chat_id", group.chat_id);
        }
      } catch (e) {
        console.error(`Failed to send to group ${group.chat_id}:`, e);
        results.push({ chat_id: group.chat_id, ok: false, error: String(e) });
      }
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
