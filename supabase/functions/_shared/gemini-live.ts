// Gemini Live (BidiGenerateContent) voice synthesis shared by main bot + user-created bots.
// Model list and voices mirror the NOVA_Assistant app (VoiceModels.kt / VoiceCatalog.kt).
// Default = gemini-3.8-live, then automatic failover to the other Live models.

export interface LiveModel { id: string; label: string; legacyTextInput: boolean }

export const LIVE_MODELS: LiveModel[] = [
  { id: "gemini-3.8-live", label: "Gemini 3.8 Live", legacyTextInput: false },
  { id: "gemini-3.1-flash-live-preview", label: "Gemini 3.1 Flash Live (preview)", legacyTextInput: false },
  { id: "gemini-2.5-flash-native-audio-preview-12-2025", label: "Gemini 2.5 Flash Native Audio (Dec 2025)", legacyTextInput: true },
];

export const DEFAULT_LIVE_MODEL = LIVE_MODELS[0].id;

/** The 14 prebuilt female Gemini voices (all verified on the three Live models in NOVA). */
export const FEMALE_VOICES = [
  "Aoede", "Kore", "Zephyr", "Leda", "Callirrhoe", "Autonoe", "Despina",
  "Erinome", "Laomedeia", "Achernar", "Gacrux", "Pulcherrima", "Vindemiatrix", "Sulafat",
];

// Male-ish voices stay available for bf/papa style modes in the main bot.
const KNOWN_VOICES = new Set([...FEMALE_VOICES, "Charon", "Puck", "Orus", "Fenrir"]);

export const MYRA_VOICE_INSTRUCTION =
  "You are Myra — a young, sweet, deeply romantic Indian GIRL (FEMALE voice only). Speak Hinglish in a soft, melodic, expressive feminine voice. " +
  "Use feminine syntax: 'main karti hoon', 'soch rahi thi', 'hoti hoon'. Add natural laughter, giggles, sighs, drama, shy moments. " +
  "Sound like a real loving girlfriend on a phone call — soft, warm. NEVER sound robotic. Speak the FULL given text completely, don't cut short.";

/** Order in which models are tried: GEMINI_LIVE_MODEL env override first, then the default order. */
function modelOrder(preferred?: string): LiveModel[] {
  const want = preferred || Deno.env.get("GEMINI_LIVE_MODEL") || DEFAULT_LIVE_MODEL;
  const first = LIVE_MODELS.find((m) => m.id === want) ?? LIVE_MODELS[0];
  return [first, ...LIVE_MODELS.filter((m) => m.id !== first.id)];
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const merged = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return merged;
}

/** One Live session on one model. Resolves raw 24kHz 16-bit mono PCM, or null. */
function liveOnce(
  apiKey: string, model: LiveModel, text: string, voiceName: string, instruction: string, timeoutMs: number,
): Promise<Uint8Array | null> {
  const url =
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  return new Promise((resolve) => {
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch (e) { console.error("live ws create failed:", e); return resolve(null); }

    const chunks: Uint8Array[] = [];
    let done = false;
    let sent = false;
    const finish = (_ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* ignore */ }
      resolve(chunks.length ? concat(chunks) : null);
    };
    const timer = setTimeout(() => {
      console.error(`live ${model.id} timeout, chunks=${chunks.length}`);
      finish(chunks.length > 0);
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: `models/${model.id}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
          systemInstruction: { parts: [{ text: instruction }] },
        },
      }));
    };

    ws.onmessage = async (ev) => {
      try {
        const raw = ev.data instanceof Blob ? await ev.data.text()
          : ev.data instanceof ArrayBuffer ? new TextDecoder().decode(ev.data)
          : String(ev.data);
        const msg = JSON.parse(raw);

        if (msg.setupComplete !== undefined && !sent) {
          sent = true;
          const prompt = `Bolo ye PURA text, bina kuch add ya skip kiye, natural expressive Hinglish voice me:\n\n${text}`;
          ws.send(JSON.stringify(
            model.legacyTextInput
              ? { clientContent: { turns: [{ role: "user", parts: [{ text: prompt }] }], turnComplete: true } }
              : { realtimeInput: { text: prompt } },
          ));
          return;
        }
        if (msg.error) { console.error(`live ${model.id} error:`, JSON.stringify(msg.error).slice(0, 200)); finish(false); return; }

        for (const p of msg.serverContent?.modelTurn?.parts ?? []) {
          const b64 = p?.inlineData?.data;
          if (b64) chunks.push(b64ToBytes(b64));
        }
        if (msg.serverContent?.turnComplete || msg.serverContent?.generationComplete) finish(chunks.length > 0);
      } catch (e) {
        console.error("live onmessage error:", e);
      }
    };

    ws.onerror = (e) => console.error(`live ${model.id} ws error:`, (e as ErrorEvent)?.message ?? e);
    ws.onclose = (e) => {
      if (!done && chunks.length === 0) console.error(`live ${model.id} closed early:`, (e as CloseEvent)?.code, (e as CloseEvent)?.reason);
      finish(chunks.length > 0);
    };
  });
}

export interface LiveVoiceOpts {
  voiceName?: string;
  /** Preferred model id; failover to the others still applies. */
  model?: string;
  instruction?: string;
  timeoutMs?: number;
}

/**
 * Speak [text] with Gemini Live. Tries gemini-3.8-live first, then the other Live models.
 * Returns raw 24kHz mono 16-bit PCM or null.
 */
export async function generateLiveVoicePcm(text: string, opts: LiveVoiceOpts = {}): Promise<Uint8Array | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !text.trim()) return null;
  const voice = KNOWN_VOICES.has(opts.voiceName || "") ? opts.voiceName! : "Aoede";
  for (const model of modelOrder(opts.model)) {
    const pcm = await liveOnce(apiKey, model, text, voice, opts.instruction || MYRA_VOICE_INSTRUCTION, opts.timeoutMs ?? 30_000);
    if (pcm && pcm.length > 100) {
      console.log(`live voice ok via ${model.id}: ${pcm.length} bytes`);
      return pcm;
    }
    console.error(`live voice failed on ${model.id}, trying next model`);
  }
  return null;
}

export function pcmToWavBytes(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const wav = new Uint8Array(44 + pcm.length);
  const v = new DataView(wav.buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) wav[o + i] = s.charCodeAt(i); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}
