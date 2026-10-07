const VOICE_MODELS = [
  "google/gemini-3.1-flash-tts-preview",
  "google/gemini-2.5-pro-tts",
] as const;

function selectVoiceModel(userId?: number): string {
  if (typeof userId !== "number") return VOICE_MODELS[0];
  return VOICE_MODELS[Math.abs(userId) % VOICE_MODELS.length];
}

export async function sendGeminiTelegramVoice(
  botToken: string,
  chatId: number,
  text: string,
  voiceName = "Aoede",
  userId?: number,
): Promise<boolean> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !text.trim()) return false;

  const primaryIndex = VOICE_MODELS.indexOf(selectVoiceModel(userId) as typeof VOICE_MODELS[number]);
  const orderedModels = [VOICE_MODELS[primaryIndex], VOICE_MODELS[1 - primaryIndex]];
  let audio: Uint8Array | null = null;

  for (let index = 0; index < orderedModels.length; index += 1) {
    const model = orderedModels[index];
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          contents: [{ role: "user", parts: [{ text: `Speak this complete message warmly in a natural Indian female voice: ${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
          stream_format: "audio",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Gemini TTS request failed (${model}):`, response.status, errorBody.slice(0, 300));
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || index === orderedModels.length - 1) return false;
        const retryAfter = Number(response.headers.get("retry-after"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 500 + Math.floor(Math.random() * 500);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      audio = new Uint8Array(await response.arrayBuffer());
      if (audio.length >= 100) break;
      audio = null;
      if (index === orderedModels.length - 1) return false;
    } catch (error) {
      console.error(`Gemini TTS error (${model}):`, error);
      return false;
    }
  }

  if (!audio) return false;

  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("voice", new Blob([audio], { type: "audio/wav" }), "myra-voice.wav");
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
      method: "POST",
      body: form,
    });
    if (telegramResponse.ok) return true;

    console.error("Telegram sendVoice failed:", telegramResponse.status, (await telegramResponse.text()).slice(0, 300));
    const audioForm = new FormData();
    audioForm.append("chat_id", String(chatId));
    audioForm.append("audio", new Blob([audio], { type: "audio/wav" }), "myra-voice.wav");
    const audioResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
      method: "POST",
      body: audioForm,
    });
    if (audioResponse.ok) return true;
    console.error("Telegram sendAudio fallback failed:", audioResponse.status, (await audioResponse.text()).slice(0, 300));
    return false;
  } catch (error) {
    console.error("Telegram voice delivery error:", error);
    return false;
  }
}