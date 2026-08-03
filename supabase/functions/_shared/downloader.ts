// ===== Social media downloader (Instagram / Facebook / YouTube / Pinterest / TikTok / X ...) =====

export const SOCIAL_URL_REGEX =
  /(https?:\/\/(?:www\.|m\.|mobile\.)?(?:instagram\.com|instagr\.am|facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be|pinterest\.com|pin\.it|tiktok\.com|vt\.tiktok\.com|twitter\.com|x\.com|snapchat\.com|reddit\.com|threads\.net|dailymotion\.com|vimeo\.com|linkedin\.com|tumblr\.com|soundcloud\.com|likee\.video|sharechat\.com|moj\.tv)\/[^\s]+)/i;

export function extractSocialUrl(text: string): string | null {
  const m = text.match(SOCIAL_URL_REGEX);
  return m ? m[1].replace(/[)\]}.,]+$/, "") : null;
}

export type DlFormat = "mp3" | "360" | "720" | "1080" | "max";

export interface DlResult {
  ok: boolean;
  kind?: "video" | "audio" | "photo";
  url?: string;
  items?: string[];
  error?: string;
}

// Public cobalt-compatible instances (tried in order)
const COBALT_INSTANCES = [
  "https://co.otomir23.me",
  "https://cobalt-api.kwiatekmiki.com",
  "https://cobalt.255x.ru",
  "https://dl.khyernet.xyz",
  "https://cobalt-backend.canine.tools",
  "https://api.cobalt.tools",
  "https://co.wuk.sh",
];

function payloadFor(url: string, format: DlFormat) {
  const isAudio = format === "mp3";
  const quality = format === "max" ? "max" : format === "mp3" ? "720" : format;
  return {
    modern: {
      url,
      videoQuality: quality,
      downloadMode: isAudio ? "audio" : "auto",
      audioFormat: "mp3",
      filenameStyle: "basic",
      alwaysProxy: true,
    },
    legacy: {
      url,
      vQuality: quality,
      isAudioOnly: isAudio,
      aFormat: "mp3",
      filenamePattern: "basic",
      isNoTTWatermark: true,
    },
  };
}

export async function resolveDownload(url: string, format: DlFormat): Promise<DlResult> {
  const bodies = payloadFor(url, format);
  let lastError = "";

  for (const base of COBALT_INSTANCES) {
    for (const body of [bodies.modern, bodies.legacy]) {
      for (const path of ["/", "/api/json"]) {
        try {
          const r = await fetch(base + path, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
          });
          if (!r.ok) {
            lastError = `${base}${path} -> ${r.status}`;
            continue;
          }
          const d = await r.json().catch(() => null);
          if (!d) continue;
          const status = String(d.status || "").toLowerCase();

          if ((status === "tunnel" || status === "redirect" || status === "stream") && d.url) {
            return { ok: true, kind: format === "mp3" ? "audio" : "video", url: d.url };
          }
          if (status === "picker" && Array.isArray(d.picker) && d.picker.length) {
            const items = d.picker.map((p: any) => p.url).filter(Boolean);
            const kind = d.picker[0]?.type === "photo" ? "photo" : "video";
            return { ok: true, kind, url: items[0], items };
          }
          if (status === "error") {
            lastError = d.error?.code || d.text || "provider error";
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
    }
  }

  return { ok: false, error: lastError || "No downloader instance responded" };
}
