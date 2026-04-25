// ElevenLabs wrapper.
//
// CRITICAL: SPEC §pitch and §9. Two distinct functions:
//   - narrate()         — neutral "Kin" narrator voice. Used for ambient
//                         prompts, app navigation, recorder-side question
//                         playback during the interview (per Q1).
//   - renderQuestion()  — recorder's cloned voice. Used ONLY when rendering
//                         memo question audio for recipient-side playback,
//                         and ONLY in lib/render.ts (render-once-freeze).
//
// A family member's cloned voice telling you "your battery is low" would be
// horrifying. The two functions are separate to make that mistake hard.

"use client";

import { isDemoMemo, isDemoMode } from "./demo";
import { log } from "./log";

const KIN_NARRATOR_VOICE_ID = "kin-narrator-default"; // ElevenLabs preset

// ─── browser SpeechSynthesis fallback ────────────────────────────────────────

function speakBrowser(text: string, voiceHint?: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    if (voiceHint) {
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((v) => v.name.toLowerCase().includes(voiceHint.toLowerCase())) ??
        voices[0];
      if (match) utter.voice = match;
    }
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// ─── public API ──────────────────────────────────────────────────────────────

// Speak in the neutral narrator voice. Used for ambient prompts and the
// recorder-side interview (per Q1). Always neutral — never cloned.
export async function narrate(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_KIN_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_ELEVENLABS_AVAILABLE) {
    return speakBrowser(text);
  }
  // Live path: hit /api/elevenlabs?kind=narrate, get audio bytes, play.
  // Falls back to browser speech synthesis on failure.
  try {
    const res = await fetch("/api/elevenlabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "narrate", voiceId: KIN_NARRATOR_VOICE_ID, text }),
    });
    if (!res.ok) throw new Error(`narrate ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (err) {
    log.warn("elevenlabs", "narrate fell back to browser TTS", err);
    await speakBrowser(text);
  }
}

// Render a memo question in the recorder's cloned voice. Returns an audio
// Blob that lib/render.ts persists into IndexedDB. Frozen forever — never
// re-rendered.
export async function renderQuestion(args: {
  memoId: string;
  questionIndex: number;
  voiceCloneId: string | null;
  text: string;
}): Promise<Blob> {
  if (isDemoMode() && isDemoMemo(args.memoId)) {
    // Demo memo's audio is pre-rendered as static assets — we don't render
    // anything live. Return a tiny silent placeholder; lib/audio-loader.ts
    // resolves the real asset by key.
    return new Blob([new Uint8Array(0)], { type: "audio/mpeg" });
  }
  if (!args.voiceCloneId) {
    // No clone — fall back to neutral narrator voice. Caller tags the memo
    // with voiceUsedForQuestions: "kin-narrator" so playback labels it as
    // "in a stand-in voice."
    return speakBrowserToBlob(args.text);
  }
  try {
    const res = await fetch("/api/elevenlabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "render-question", voiceId: args.voiceCloneId, text: args.text }),
    });
    if (!res.ok) throw new Error(`render-question ${res.status}`);
    return await res.blob();
  } catch (err) {
    log.warn("elevenlabs", "render-question fell back to browser TTS", err);
    return speakBrowserToBlob(args.text);
  }
}

async function speakBrowserToBlob(_text: string): Promise<Blob> {
  // Browser SpeechSynthesis can't capture to a Blob without OfflineAudioContext
  // hackery. For the hackathon's no-key path, return a placeholder; the demo
  // never hits this branch.
  return new Blob([new Uint8Array(0)], { type: "audio/mpeg" });
}
