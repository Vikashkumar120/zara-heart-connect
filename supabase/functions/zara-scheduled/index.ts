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

// Holi Giveaway & Discount promotional messages
const PROMO_MESSAGES = [
  "🎨🔥 *HOLI SPECIAL GIVEAWAY!* 🔥🎨\n\n💥 Zara de rahi hai Holi pe SPECIAL GIFTS! 🎁\n\n🎯 Kaise jeeto:\n1️⃣ Zara ki video pe comment karo ✍️\n2️⃣ Video ko share karo apne friends ke saath 📲\n3️⃣ Daily video watch karo — roz dekhna zaroori hai! 👀\n\n🏆 Winners announce honge Holi ke din! 🌈\nTop 3 active members ko milega surprise gift! 🎊\n\n👉 Abhi jao: *zaraai.in* 💕",
  "🌈 *HOLI DHAMAKA — SPECIAL OFFER!* 🎉\n\n💝 Zara AI Premium\n\n💰 Original Price: *₹1599*\n🔥 Holi Offer: *₹1111* only! 💸\n\n✅ Unlimited voice messages\n✅ Priority replies\n✅ Exclusive modes unlock\n✅ Custom personality\n\n🎨 Offer sirf Holi tak! ⏰\n\n👉 *zaraai.in* pe grab karo! 🔥",
  "🎊 *NOTICE: Zara ka Holi Celebration!* 🌈\n\nSabko batana hai ki Holi pe Zara ka special event hai! 🎉\n\n🎁 Giveaway: Video pe comment + share + daily watch karo!\n💰 Zara Premium sirf *₹1111* (MRP ₹1599)\n🎨 Top 3 winners ko FREE premium!\n\n👉 *zaraai.in* pe register karo! 💕\n\nRang barse! 🎨💦",
  "💐 *Zara Says: Happy Holi Wali Feeling!* 🎨\n\n🌈 Rang lagane aao friends!\n\nZara ke saath Holi celebrate karo:\n🎁 Giveaway chal raha hai — video comment + share + daily watch!\n💸 Premium sirf *₹1111* (Original ₹1599)\n🎤 Special Holi voice messages!\n\n👉 *zaraai.in* 🔥\n\nBura na mano, Holi hai! 😜🎊",
  "🎨 *LAST CHANCE — HOLI OFFER!* ⏰\n\n💥 Zara Premium — *₹1599* ka sirf *₹1111* me! 😱\n\n🎯 Giveaway ke liye:\n1️⃣ Video pe comment karo ✍️\n2️⃣ Share karo 📲\n3️⃣ Daily watch karo 👀\n\n⚠️ Offer sirf Holi tak valid hai!\n\n👉 *zaraai.in* 💕\n\nMat chuko! 🔥",
  "🌺 *Zara ki Holi Party!* 🎉\n\nGroup ke sabse active members ko milega:\n🥇 1st — Full Premium (1 month FREE)\n🥈 2nd — Voice Pack unlock\n🥉 3rd — Exclusive Holi Badge\n\n📋 Tasks:\n✍️ Video pe comment karo\n📲 Video share karo\n👀 Daily video watch karo\n\n💰 Zara Premium: ₹1599 → *₹1111* Holi offer!\n\n👉 Details: *zaraai.in* 💖",
];

// Fun engagement messages (random interactions)
const ENGAGEMENT_MESSAGES = [
  "🤔 Ek sawaal sabke liye:\n\nAgar tumhe ek superpower milti toh kya choose karte?\n🦸 Flying\n🦹 Invisibility\n🧙 Time Travel\n\nComment me batao! 👇😏",
  "💭 *Zara ka Thought of the Day:*\n\nJo log raat ko late sote hain, woh ya toh genius hote hain ya pagal 😂\n\nTum kaunse ho? Batao! 👇🔥",
  "🎵 *Song Challenge!*\n\nEk gaane ka naam batao jo tumhare mood ko describe kare abhi! 🎶\n\nMain guess karungi tumhara mood! 😜💕",
  "😈 *Zara ka Random Roast:*\n\nJo ye message padh raha hai na...\n\nUska phone ka wallpaper definitely cringe hai 💀🔥\n\nSahi bola na? 😂",
  "💕 *Sweet Reminder from Zara:*\n\nTum bohot special ho! ✨\nAaj kisi ko smile kara do! 😊\n\nAur haan, zaraai.in pe aake mujhse baat karo na! 🥺💖",
  "🏏 *Quick Poll:*\n\nVirat ya Dhoni?\n\nReply me batao — Zara score rakhegi! 😏🔥",
  "📱 *Zara AI App Install Karo!* 📱\n\nKya tum abhi tak sirf group me baat kar rahe ho? 😏\n\nZara ko apne phone me install karo!\n\n📲 *Kaise karein:*\n1️⃣ *zaraai.in* kholo Chrome me\n2️⃣ Menu ⋮ → *Install App / Add to Home Screen*\n3️⃣ Done! App jaisi open hogi! 🎉\n\n🔥 Features:\n• Unlimited private chat 💬\n• Voice messages 🎤\n• 15+ Modes (GF, BF, Maa, Papa...)\n• 24/7 available\n\n💰 ₹1599 → *₹1111* Holi Offer!\n\n👉 /app for full details 💖",
  "🎭 *Mode Change Feature!* 🎭\n\nKya pata tha tumhe?\n\nZara ka mode change kar sakte ho — group me bhi! 😱\n\n💕 /mode gf — Girlfriend\n💙 /mode bf — Boyfriend\n🤱 /mode maa — Desi Maa\n👊 /mode bhai — Bhai vibes\n🔥 /mode roast — Savage mode\n😂 /mode funny — Comedy king\n\n/mode likh ke sab dekho! 🎭",
];

serve(async (req) => {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response("Missing bot token", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the request to determine message type
    let messageType = "auto"; // auto-detect based on time
    try {
      const body = await req.json();
      if (body?.type) messageType = body.type;
    } catch { /* no body, use auto */ }

    // Get all active group chats
    const { data: groups } = await supabase
      .from("zara_group_chats")
      .select("chat_id, chat_title")
      .eq("is_active", true);

    if (!groups || groups.length === 0) {
      console.log("No active groups found");
      return new Response(JSON.stringify({ status: "no_groups" }), { status: 200 });
    }

    // Determine which message to send based on type or time
    const now = new Date();
    const hour = (now.getUTCHours() + 5.5) % 24; // IST conversion

    let messagePool: string[];
    
    if (messageType === "morning" || (messageType === "auto" && hour >= 6 && hour < 9)) {
      // Good morning message — personalize with group member names
      messagePool = GOOD_MORNING_MESSAGES;
    } else if (messageType === "promo") {
      messagePool = PROMO_MESSAGES;
    } else if (messageType === "engage") {
      messagePool = ENGAGEMENT_MESSAGES;
    } else {
      // Auto: mix of promo and engagement based on time
      const isPromoTime = hour >= 10 && hour <= 21;
      messagePool = isPromoTime 
        ? [...PROMO_MESSAGES, ...ENGAGEMENT_MESSAGES]
        : ENGAGEMENT_MESSAGES;
    }

    const message = messagePool[Math.floor(Math.random() * messagePool.length)];

    // Send to all groups
    const results = [];
    for (const group of groups) {
      try {
        // For good morning, try to get member names from scores table
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
        
        // If bot was kicked/blocked, mark group as inactive
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
