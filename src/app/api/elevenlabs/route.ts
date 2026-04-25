// Server-side ElevenLabs proxy. Holds API key off the client.
// kind: "narrate" | "render-question". Returns audio/mpeg bytes.
//
// Sets a custom response header `x-eleven-voice` so the client can show
// which voice it's hearing. Errors are returned as JSON with detail.
//
// Free-tier accounts can't hit "library" voices via the API (402
// paid_plan_required). When that happens we list /v1/voices for the
// account and retry with the first usable voice in their workspace —
// usually a cloned voice or a default premade that's sticky to the
// account. Result is cached for the server lifetime so subsequent
// requests skip the discovery roundtrip.

import { NextResponse } from "next/server";

// Rachel — the historical "default" stock voice. Works on paid tiers but
// is now considered a library voice on free tier (blocked with 402).
// Override per environment with ELEVENLABS_NARRATOR_VOICE_ID. The auto-
// discovery path below kicks in when this doesn't work for the account.
//
// Other production-friendly stock voices:
//   Sarah  — EXAVITQu4vr4xnSDxMAC  (warm, soft female)
//   Aria   — 9BWtsMINqrJLrRacOk9x  (confident, rich narration)
//   Brian  — nPczCjzI2devNBz1zQrb  (deep, conversational male)
//   Charlie — IKne3meq5aSn9XLyUdCD (relaxed casual male)
const DEFAULT_NARRATOR_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

const NARRATE_MODEL = process.env.ELEVENLABS_NARRATE_MODEL || "eleven_multilingual_v2";
const RENDER_MODEL = "eleven_multilingual_v2";

// Module-level cache of an auto-discovered narrator voice. Cleared on
// server restart. Keyed by account so swapping API keys re-discovers.
let cachedNarratorVoice: { apiKey: string; voiceId: string } | null = null;

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

  const isNarrate = kind !== "render-question";

  const explicitVoiceId =
    (typeof body.voiceId === "string" && body.voiceId) ||
    process.env.ELEVENLABS_NARRATOR_VOICE_ID ||
    null;

  // For render-question we honor the cloned recorder voice exactly. For
  // narrate we fall through to discovery so free-tier setups still work.
  const initialVoiceId =
    explicitVoiceId ||
    (isNarrate && cachedNarratorVoice?.apiKey === apiKey
      ? cachedNarratorVoice.voiceId
      : DEFAULT_NARRATOR_VOICE_ID);

  const model = isNarrate ? NARRATE_MODEL : RENDER_MODEL;

  let attempt = await tts(apiKey, initialVoiceId, text, model, isNarrate);

  // If the configured voice is paywalled for this account and we're in
  // narrate mode, look up the user's workspace voices and retry. Skip
  // for render-question — that voice id is the recorder's clone and a
  // 402 there means the account can't render at all.
  if (
    !attempt.ok &&
    isNarrate &&
    !explicitVoiceId &&
    isPaymentRequired(attempt)
  ) {
    const discovered = await discoverWorkspaceVoice(apiKey);
    if (discovered && discovered !== initialVoiceId) {
      const retry = await tts(apiKey, discovered, text, model, isNarrate);
      if (retry.ok) {
        cachedNarratorVoice = { apiKey, voiceId: discovered };
      }
      attempt = retry;
    }
  }

  if (!attempt.ok) {
    return NextResponse.json(
      {
        error: attempt.errorText,
        status: attempt.status,
        voiceId: attempt.voiceId,
        model,
        hint: hintFor(attempt),
      },
      { status: attempt.status },
    );
  }

  return new Response(attempt.audio, {
    status: 200,
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
      "x-eleven-voice": attempt.voiceId,
      "x-eleven-model": model,
    },
  });
}

type TTSResult =
  | { ok: true; audio: ArrayBuffer; voiceId: string; status: 200 }
  | { ok: false; errorText: string; status: number; voiceId: string };

async function tts(
  apiKey: string,
  voiceId: string,
  text: string,
  model: string,
  isNarrate: boolean,
): Promise<TTSResult> {
  const voice_settings = isNarrate
    ? { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true }
    : { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true };

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: model, voice_settings }),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    return { ok: false, errorText, status: res.status, voiceId };
  }
  const audio = await res.arrayBuffer();
  return { ok: true, audio, voiceId, status: 200 };
}

function isPaymentRequired(r: TTSResult): boolean {
  if (r.ok) return false;
  if (r.status === 402) return true;
  // ElevenLabs sometimes returns 401 with payment_required body for free
  // tier on library voices. Sniff the JSON detail too.
  return /paid_plan_required|payment_required|library voices/i.test(r.errorText);
}

interface WorkspaceVoice {
  voice_id: string;
  name?: string;
  category?: string;
}

async function discoverWorkspaceVoice(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey, accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { voices?: WorkspaceVoice[] };
    const voices = j.voices ?? [];
    if (voices.length === 0) return null;

    // Prefer voices the user has agency over: cloned > generated >
    // professional > premade. The first cloned voice is usually the user
    // themselves on free tier — fine for narration as a stop-gap.
    const order = ["cloned", "generated", "professional", "premade"];
    for (const cat of order) {
      const hit = voices.find((v) => (v.category || "").toLowerCase() === cat);
      if (hit?.voice_id) return hit.voice_id;
    }
    return voices[0]?.voice_id ?? null;
  } catch {
    return null;
  }
}

function hintFor(r: TTSResult): string | undefined {
  if (r.ok) return undefined;
  if (isPaymentRequired(r)) {
    return "Free ElevenLabs accounts can't use library voices via the API. Either upgrade your plan, or open elevenlabs.io → Voices → My Voices, copy a voice ID you have access to (e.g. a cloned voice), and set it as ELEVENLABS_NARRATOR_VOICE_ID in .env.local.";
  }
  if (r.status === 401) {
    return "Bad ELEVENLABS_API_KEY. Double-check it at elevenlabs.io → Profile → API Key.";
  }
  if (r.status === 429) {
    return "ElevenLabs quota exhausted for this billing window.";
  }
  return undefined;
}
