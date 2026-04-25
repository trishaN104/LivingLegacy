// Server-side ElevenLabs proxy. Holds API key off the client.
// kind: "narrate" | "render-question". Returns audio/mpeg bytes.
//
// Sets a custom response header `x-eleven-voice` so the client can show
// which voice it's hearing. Errors are returned as JSON with detail.

import { NextResponse } from "next/server";

// Rachel — the most universally-available stock voice on ElevenLabs. Works
// on every account tier including the free plan. Override per environment
// with ELEVENLABS_NARRATOR_VOICE_ID; we leave a known good ID baked in so
// the demo Just Works the first time.
//
// Other production-friendly stock voices:
//   Sarah  — EXAVITQu4vr4xnSDxMAC  (warm, soft female)
//   Aria   — 9BWtsMINqrJLrRacOk9x  (confident, rich narration)
//   Brian  — nPczCjzI2devNBz1zQrb  (deep, conversational male)
//   Charlie — IKne3meq5aSn9XLyUdCD (relaxed casual male)
const DEFAULT_NARRATOR_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// `eleven_multilingual_v2` is the universally-available premium model.
// Turbo v2.5 is faster but not on every account tier — we keep the fallback
// chain in narrate() so a 4xx on the first model swaps to multilingual.
const NARRATE_MODEL = process.env.ELEVENLABS_NARRATE_MODEL || "eleven_multilingual_v2";
const RENDER_MODEL = "eleven_multilingual_v2";

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 503 },
    );
  }

  const body = await req.json();
  const kind = body.kind as "narrate" | "render-question" | undefined;
  const text = body.text as string;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const voiceId =
    (typeof body.voiceId === "string" && body.voiceId) ||
    process.env.ELEVENLABS_NARRATOR_VOICE_ID ||
    DEFAULT_NARRATOR_VOICE_ID;

  const isNarrate = kind !== "render-question";

  // Voice settings tuned for warm, grounded interviewer cadence. Stability
  // a touch lower than default keeps natural pitch variation; style nudges
  // the voice toward conversational delivery; speaker_boost adds presence.
  const voice_settings = isNarrate
    ? { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true }
    : { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true };

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: isNarrate ? NARRATE_MODEL : RENDER_MODEL,
      voice_settings,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Surface upstream error verbatim so the user can debug from the
    // network panel — most common: 401 (bad key), 404 (voice not on this
    // account), 429 (quota exhausted).
    return NextResponse.json(
      { error: errText, status: res.status, voiceId, model: isNarrate ? NARRATE_MODEL : RENDER_MODEL },
      { status: res.status },
    );
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
      "x-eleven-voice": voiceId,
      "x-eleven-model": isNarrate ? NARRATE_MODEL : RENDER_MODEL,
    },
  });
}
