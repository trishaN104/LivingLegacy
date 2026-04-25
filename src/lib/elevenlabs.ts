// ElevenLabs wrapper.
//
// CRITICAL: SPEC §pitch and §9. Two distinct functions:
//   - narrate()         — neutral narrator voice. Used for ambient prompts,
//                         app navigation, recorder-side question playback
//                         during the interview (per Q1).
//   - renderQuestion()  — recorder's cloned voice. Used ONLY when rendering
//                         memo question audio for recipient-side playback,
//                         and ONLY in lib/render.ts (render-once-freeze).
//
// A family member's cloned voice telling you "your battery is low" would be
// horrifying. The two functions are separate to make that mistake hard.
//
// narrate() returns a status object so the UI can show whether ElevenLabs
// played, the browser fell back, or something errored. The InterviewStep
// surfaces this — if you see "Voice: browser" you need a key, a voice your
// account can use, or quota.

"use client";

import { isDemoMemo, isDemoMode } from "./demo";
import { log } from "./log";

export type NarrateStatus =
  | { source: "elevenlabs"; voice?: string; model?: string }
  | { source: "browser"; reason: string };

// ─── browser SpeechSynthesis fallback ────────────────────────────────────────

function speakBrowser(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    // Prefer a higher-quality system voice when one is available. Apple's
    // "Samantha" and Google's "Google US English" beat the bone-dry default.
    const preferredHints = ["samantha", "karen", "google us english", "natural"];
    const match =
      voices.find((v) => preferredHints.some((h) => v.name.toLowerCase().includes(h))) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
      voices[0];
    if (match) utter.voice = match;
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
//
// Returns the source actually used so the UI can surface a status badge.
export async function narrate(text: string): Promise<NarrateStatus> {
  if (typeof window === "undefined") return { source: "browser", reason: "ssr" };
  stopCurrent();
  try {
    const res = await fetch("/api/elevenlabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "narrate", text }),
    });
    if (!res.ok) {
      // Try to extract the upstream error so the console explains why
      // we're falling back. Most common: 503 (no key), 401 (bad key),
      // 404 (voice not on this account), 429 (quota).
      let detail = `narrate ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) detail = `${res.status}: ${typeof j.error === "string" ? j.error : JSON.stringify(j.error)}`;
      } catch {
        // ignore
      }
      log.warn("elevenlabs", detail);
      await speakBrowser(text);
      return { source: "browser", reason: detail };
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      await speakBrowser(text);
      return { source: "browser", reason: "empty body" };
    }
    const voice = res.headers.get("x-eleven-voice") ?? undefined;
    const model = res.headers.get("x-eleven-model") ?? undefined;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    currentNarration = { audio, url };
    audio.addEventListener("ended", () => {
      if (currentNarration?.audio === audio) {
        URL.revokeObjectURL(url);
        currentNarration = null;
      }
    });
    try {
      await audio.play();
    } catch (err) {
      // Autoplay can still be blocked in edge cases (e.g. tab not focused).
      log.warn("elevenlabs", "audio.play() rejected", err);
      await speakBrowser(text);
      return { source: "browser", reason: "autoplay blocked" };
    }
    return { source: "elevenlabs", voice, model };
  } catch (err) {
    log.warn("elevenlabs", "narrate threw", err);
    await speakBrowser(text);
    return {
      source: "browser",
      reason: err instanceof Error ? err.message : String(err),
    };
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
