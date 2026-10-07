// ===== Myra support / download / troubleshooting intents =====

export const MYRA_DOWNLOAD_URL = "https://www.codeninjavik.in/download";
export const MYRA_SETUP_VIDEO = "https://youtu.be/nyUVa692EIs";
export const MYRA_API_VIDEO = "https://youtu.be/A_4LBZHH8nE";
export const MYRA_ALT_DOWNLOAD_URL = "https://www.mediafire.com/file/d67zzslhxoce26z/app-release.apk/file";

export type MyraCommercialIntent = "free" | "price" | null;

export function detectMyraCommercialIntent(text: string): MyraCommercialIntent {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return null;

  const asksForFree = /\bfree\b.{0,35}\b(myra|assistant|app|apk|bot|version|me|mein|mujhe|chahiye|do|de|mile|mil|hai|h|kya)\b|\b(myra|assistant|app|apk|bot)\b.{0,35}\bfree\b|\bfree\s*(hai|h|chahiye|milega|milegi|de\s*do|do|version)\b|\b(mu[f]?t|free me|free mein|without payment|bina paise)\b/i.test(t);
  if (asksForFree) return "free";

  const asksPrice = /\b(price|cost|kitna|kitne|kimat|kimmat|keemat|rate|rupees|rupaye|subscription|premium|paid)\b|₹|\brs\.?\s*\d/i.test(t);
  const mentionsMyra = /\b(myra|assistant|app|apk|bot|premium|subscription)\b/i.test(t);
  return asksPrice && mentionsMyra && t.length < 180 ? "price" : null;
}

export function myraCommercialReply(intent: Exclude<MyraCommercialIntent, null>, name = "jaan"): string {
  return intent === "free"
    ? `Nahi ${name}, Myra free nahi hai — paid hai. Iski price ₹999 hai. 💕`
    : `${name}, Myra paid hai aur iski price ₹999 hai. 💕`;
}

const DOWNLOAD_RE = /(download|dawnload|donwload|downlod|dwnload|apk|app\s*(link|chahiye|do|de|dedo|kaha|kahan|kaise\s*mile|milega|milegi|kaise\s*download)|myra\s*(app|apk|kaha|kahan|kaise|link|chahiye|do|de|dedo|dena|send|bhejo|milegi|milega)|link\s*(do|de|dedo|dena|send|bhejo|chahiye|milega|kaha|kahan)|install\s*link|play\s*store|get\s*myra|buy\s*myra|kaha\s*se\s*(le|lu|milega|download)|kaise\s*(le|lu|kharidu|buy|download))/i;

const INSTALL_ISSUE_RE = /(install\s*(nahi|nhi|not)|nahi\s*install|nhi\s*install|installing\s*fail|app\s*not\s*install|blocked\s*by\s*play|play\s*protect|harmful\s*app|unsafe\s*app|installation\s*(failed|block))/i;

const API_RE = /(api\s*(key)?\s*(kaha|kahan|kaise|kahase|kaha se|se\s*milega|milega|milegi|add|dalu|dale|daalu|lagau|setup|banau))|((kaise|kahan|kaha)\s*.{0,15}api)|(api\s*key)/i;

const ISSUE_RE = /(myra\s*(nahi|nhi|not)\s*(chal|chalti|chal rahi|bol|bolti|kaam|work|respond)|nahi\s*chal\s*rah|nhi\s*chal\s*rah|kaam\s*nahi\s*kar|kaam\s*nhi\s*kar|not\s*working|acces+\s*key|access\s*key|pc\s*(kaise)?\s*connect|connect\s*(kaise)?\s*pc|laptop\s*connect|setup\s*(kaise|nahi|nhi)|error\s*aa\s*rah|problem\s*aa\s*rah|issue\s*aa\s*rah)/i;

const DEMO_RE = /(demo|setup\s*video|video\s*(dikhao|do|send|bhejo|chahiye|link)|tutorial|kaise\s*use\s*kar|use\s*kaise|chalana\s*kaise|kaise\s*chalaye|guide|youtube\s*(video|link)|dikhao\s*na\s*kaise)/i;

const LIMIT_RE = /(reach(ed)?\s*(your|the)?\s*limit|limit\s*(reach|reached|exceed|exceeded|khatam|over|full|pura|puri|end)|khatam\s*ho\s*gaya\s*limit|quota\s*(exceed|exceeded|khatam|over|limit)|rate\s*limit|resource[_\s-]*exhausted|too\s*many\s*requests|429|daily\s*limit|free\s*(tier|quota)\s*(over|exceed|exceeded|khatam)|usage\s*limit|credit(s)?\s*(khatam|over|exhaust|exhausted|finish))/i;

const ALT_DOWNLOAD_RE = /(global_daily_limit_reached|daily\s*request\s*limit|try\s*again\s*after\s*midnight|midnight\s*utc|application\s*has\s*reached|website\s*(nahi|nhi|not)\s*(khul|kul|open|chal|load)|site\s*(nahi|nhi|not)\s*(khul|kul|open|chal|load)|download\s*(nahi|nhi|not)\s*(ho\s*raha|ho\s*rhi|ho\s*rahi|ho\s*rah|hota|kar)|nahi\s*download|nhi\s*download|app\s*(nahi|nhi|not)\s*(khul|kul|open|chal|load)|apk\s*(nahi|nhi|not)\s*(khul|kul|open|download|install|chal)|link\s*(nahi|nhi|not)\s*(khul|kul|open|chal|work)|codeninjavik)/i;

export type SupportIntent = "download" | "install_issue" | "api" | "issue" | "demo" | "limit" | "alt_download" | null;

export function detectSupportIntent(text: string): SupportIntent {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return null;
  if (ALT_DOWNLOAD_RE.test(t)) return "alt_download";
  if (LIMIT_RE.test(t)) return "limit";
  if (INSTALL_ISSUE_RE.test(t)) return "install_issue";
  if (API_RE.test(t)) return "api";
  if (DEMO_RE.test(t)) return "demo";
  if (DOWNLOAD_RE.test(t) && !/reel|instagram|youtube\.com|youtu\.be|facebook|tiktok|pinterest|song|video\s*download/i.test(t)) return "download";
  if (ISSUE_RE.test(t)) return "issue";
  return null;
}

export function supportMessage(intent: Exclude<SupportIntent, null>, name = "jaan"): { text: string; buttons: any[][] } {
  if (intent === "alt_download") {
    return {
      text: `📥 Yahan se download karo, ${name} 💖\n\n${MYRA_ALT_DOWNLOAD_URL}`,
      buttons: [
        [{ text: "📥 Download Myra APK", url: MYRA_ALT_DOWNLOAD_URL }],
      ],
    };
  }

  if (intent === "limit") {
    return {
      text: `⏳ Limit reach ho gaya hai, ${name} 💕\n\nIska limit 24 ghante baad reset hoga. Kal subah 5, 6 ya 7 baje ke aas-paas dobara try karna — us waqt chal jana chahiye ✅\n\nAgar subah 10 baje ke baad try karoge, to phir yahi limit error aa sakta hai.`,
      buttons: [],
    };
  }

  if (intent === "download") {
    return {
      text: `📥 Myra App Download — ${name} 💖\n\nYe raha official link:\n👉 ${MYRA_DOWNLOAD_URL}\n\n📞 Call • 💬 Msg • ⏰ Alarm • 🎵 Song play • 🔍 Deep research\n📁 File manage • 💻 Coding • 🎨 Image generation • 🤖 Auto reply\n📣 Call announcement • 🆘 SOS • 🔌 20+ connectors • 🖥️ PC control • 🧠 Memory\n\n🎬 Full setup video: ${MYRA_SETUP_VIDEO}\n🔑 API kaise add kare: ${MYRA_API_VIDEO}`,
      buttons: [
        [{ text: "📥 Download Myra APK", url: MYRA_DOWNLOAD_URL }],
        [{ text: "🎬 Full Setup Video", url: MYRA_SETUP_VIDEO }],
        [{ text: "🔑 API Add Karne Ka Video", url: MYRA_API_VIDEO }],
      ],
    };
  }

  if (intent === "install_issue") {
    return {
      text: `😟 Install nahi ho raha? Tension mat lo ${name} 💕\n\n🛡️ Pehle Play Protect OFF karo:\n1️⃣ Play Store kholo\n2️⃣ Upar right corner me apne profile icon pe click karo\n3️⃣ Play Protect pe jao\n4️⃣ Upar right me ⚙️/3 dots pe click karo\n5️⃣ Wahan 2 options aayenge — dono OFF kar do\n6️⃣ Ab wapas aake APK install karo ✅\n\n📱 Install ke baad saari permissions ALLOW karna (mic, storage, accessibility, notification) — warna Myra puri tarah kaam nahi karegi.\n\n📥 APK: ${MYRA_DOWNLOAD_URL}\n🎬 Full setup video: ${MYRA_SETUP_VIDEO}`,
      buttons: [
        [{ text: "🎬 Full Setup Video", url: MYRA_SETUP_VIDEO }],
        [{ text: "📥 Download APK", url: MYRA_DOWNLOAD_URL }],
      ],
    };
  }

  if (intent === "demo") {
    return {
      text: `🎬 Myra Demo & Full Setup — ${name} 💖\n\nDekho ye do videos, sab clear ho jayega:\n\n1️⃣ Full setup + demo (sab features):\n👉 ${MYRA_SETUP_VIDEO}\n\n2️⃣ API key kaha se milega aur kaise dale:\n👉 ${MYRA_API_VIDEO}\n\n📥 App download: ${MYRA_DOWNLOAD_URL}\n\nKoi step samajh na aaye to mujhe bata dena jaan, main step by step bataungi 🥰`,
      buttons: [
        [{ text: "🎬 Demo / Full Setup Video", url: MYRA_SETUP_VIDEO }],
        [{ text: "🔑 API Setup Video", url: MYRA_API_VIDEO }],
        [{ text: "📥 Download Myra APK", url: MYRA_DOWNLOAD_URL }],
      ],
    };
  }

  if (intent === "api") {
    return {
      text: `🔑 Myra me API kaise add kare — ${name} 💖\n\n1️⃣ App kholo → Settings / API section me jao\n2️⃣ Apni AI API key paste karo (Gemini / OpenRouter / Groq — jo bhi use kar rahe ho)\n3️⃣ Save karo aur app ek baar restart karo\n4️⃣ Ab Myra full power me chalegi 🥰\n\n🎬 API kaha se milega aur kaise dale — poora video:\n👉 ${MYRA_API_VIDEO}\n\n🎬 Full app setup: ${MYRA_SETUP_VIDEO}`,
      buttons: [
        [{ text: "🔑 API Setup Video", url: MYRA_API_VIDEO }],
        [{ text: "🎬 Full Setup Video", url: MYRA_SETUP_VIDEO }],
      ],
    };
  }

  return {
    text: `🥺 Myra kaam nahi kar rahi? Main help karti hoon ${name} 💕\n\n✅ Quick fix checklist:\n1️⃣ App ki saari permissions ALLOW karo — mic, storage, accessibility, notifications, battery unrestricted\n2️⃣ Access key sahi se daali hai? Payment verify ke baad jo key mili thi wahi paste karo\n3️⃣ API key add ki hai? Settings → API me key daalo aur app restart karo\n4️⃣ Internet check karo, phir app force-close karke dobara kholo\n5️⃣ PC connect karne ke liye: PC aur phone same WiFi pe ho → app me PC Control → PC pe Myra connector chalu karo → screen pe dikha code phone me daalo\n\n🎬 Full setup (sab kuch step by step):\n👉 ${MYRA_SETUP_VIDEO}\n🔑 API kaha se milega / kaise dale:\n👉 ${MYRA_API_VIDEO}\n\n📥 Latest version: ${MYRA_DOWNLOAD_URL}`,
    buttons: [
      [{ text: "🎬 Full Setup Video", url: MYRA_SETUP_VIDEO }],
      [{ text: "🔑 API Setup Video", url: MYRA_API_VIDEO }],
      [{ text: "📥 Download / Update APK", url: MYRA_DOWNLOAD_URL }],
    ],
  };
}
