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

// ─── browser SpeechSynthesis fallback ────────────────────────────────────────
// Used only when ElevenLabs isn't reachable. Browser voices are robotic; the
// app prefers ElevenLabs whenever the server has a key configured.

function speakBrowser(text: string, voiceHint?: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
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

// ─── narration playback (single in-flight) ───────────────────────────────────
// We keep a module-level handle on whatever audio is currently speaking so a
// new question can interrupt the previous one cleanly — instead of stacking
// up overlapping voices when the user clicks "Next question" quickly.

let currentNarration: { audio: HTMLAudioElement; url: string } | null = null;

function stopCurrent() {
  if (currentNarration) {
    try {
      currentNarration.audio.pause();
    } catch {
      // ignore
    }
    URL.revokeObjectURL(currentNarration.url);
    currentNarration = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

// Speak in the neutral narrator voice. Used for ambient prompts and the
// recorder-side interview (per Q1). Always neutral — never cloned.
export async function narrate(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  stopCurrent();
  // Try ElevenLabs first. The /api/elevenlabs route returns 503 when the
  // server doesn't have ELEVENLABS_API_KEY — at which point we fall back to
  // browser TTS so the recorder still hears the question.
  try {
    const res = await fetch("/api/elevenlabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "narrate", text }),
    });
    if (!res.ok) throw new Error(`narrate ${res.status}`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("narrate empty body");
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.playbackRate = 1.05;
    currentNarration = { audio, url };
    audio.addEventListener("ended", () => {
      if (currentNarration?.audio === audio) {
        URL.revokeObjectURL(url);
        currentNarration = null;
      }
    });
    await audio.play();
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
