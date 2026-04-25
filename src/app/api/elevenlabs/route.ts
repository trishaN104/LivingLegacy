// Server-side ElevenLabs proxy. Holds API key off the client.
// kind: "narrate" | "render-question". Returns audio/mpeg bytes.

import { NextResponse } from "next/server";

// Sarah — a warm, natural female narrator. ElevenLabs stock voice.
// Override per environment with ELEVENLABS_NARRATOR_VOICE_ID; we leave a known
// good ID baked in so the demo Just Works the first time.
//
// A couple of nice alternates if Sarah doesn't fit your family:
//   Aria   — 9BWtsMINqrJLrRacOk9x  (confident, rich narration)
//   Rachel — 21m00Tcm4TlvDq8ikWAM  (calm, classic)
//   Brian  — nPczCjzI2devNBz1zQrb  (deep, conversational male)
//   Charlie — IKne3meq5aSn9XLyUdCD (relaxed casual male)
const DEFAULT_NARRATOR_VOICE_ID = "EXAVITQu4vr4xnSDxMAC"; // Sarah

// Turbo v2.5 is the fastest premium model and works in 32 languages — great
// for an interactive interviewer. Multilingual v2 is fuller but slower.
const NARRATE_MODEL = "eleven_turbo_v2_5";
const RENDER_MODEL = "eleven_multilingual_v2"; // memo questions get the higher-fidelity model

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

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=2&output_format=mp3_44100_128`;

  // Voice settings tuned for warm, grounded interviewer cadence. Stability
  // a touch lower than default keeps natural pitch variation; style nudges
  // the voice toward conversational delivery; speaker_boost adds presence.
  const voice_settings = isNarrate
    ? { stability: 0.4, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true }
    : { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true };

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
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}
