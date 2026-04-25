// Server-side ElevenLabs proxy. Holds API key off the client.
// kind: "narrate" | "render-question". Returns audio/mpeg bytes.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 503 },
    );
  }

  const body = await req.json();
  const voiceId = body.voiceId as string;
  const text = body.text as string;
  if (!voiceId || !text) {
    return NextResponse.json({ error: "voiceId and text required" }, { status: 400 });
  }

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
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.85 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}
