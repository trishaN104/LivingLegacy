// Browser SpeechSynthesis wrapper. The interviewer side (RecordingFlow)
// and the listen-back side (PlayButtonLarge) both speak text via the
// browser's built-in TTS. This module gives the recording flow a single,
// awaitable entry point that handles Chrome's quirks.
//
// Chrome quirks we work around:
//   - getVoices() returns [] until the engine asynchronously loads them.
//     speak() is silently dropped if no voice is set on the utterance,
//     which happens when getVoices() is empty — so we wait for
//     voiceschanged on the first call (with a 1500 ms fallback).
//   - cancel() right before speak() within the same tick drops the next
//     speak(). We never cancel inside speakInterviewer; cancellation only
//     happens through stopSpeaking() (and is followed by an LLM round
//     trip, giving Chrome plenty of time to reset before the next speak).
//   - onend doesn't always fire — esp. for utterances cancelled mid-air
//     or when the engine is in a weird state. We arm a duration-based
//     safety timer so the awaiter is always released.

"use client";

let voicesPrimed = false;

function primeVoices() {
  if (voicesPrimed) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voicesPrimed = true;
  const synth = window.speechSynthesis;
  // Asking once kicks off voice loading on Chrome.
  synth.getVoices();
  synth.addEventListener("voiceschanged", () => {
    synth.getVoices();
  });
}

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices();
  return (
    voices.find((v) => /samantha|google us english natural/i.test(v.name)) ??
    voices.find((v) => v.default && v.lang?.toLowerCase().startsWith("en")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
    voices[0]
  );
}

// Speak `text` and resolve when the engine reports it finished — or after a
// safety timer based on word count, whichever comes first. Never rejects.
//
// IMPORTANT: this function does NOT call synth.cancel() before speak().
// Chrome silently drops the next speak() if you cancel in the same tick.
// Callers that want to interrupt should call stopSpeaking() and *then*
// kick off the next utterance asynchronously (an LLM round trip is
// usually enough buffer).
export function speakInterviewer(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  primeVoices();
  const synth = window.speechSynthesis;

  return new Promise<void>((resolve) => {
    let done = false;
    let fired = false;
    const finalize = () => {
      if (done) return;
      done = true;
      resolve();
    };

    function fire() {
      if (fired) return;
      fired = true;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.95;
      u.pitch = 1.05;
      u.volume = 1.0;
      const v = pickVoice(synth);
      if (v) u.voice = v;
      u.onend = finalize;
      u.onerror = finalize;

      synth.speak(u);

      // Chrome silently stalls SpeechSynthesis utterances longer than
      // ~15s. Pause+resume on a timer keeps the engine awake. The
      // interval auto-clears once `done` is true.
      const keepalive = window.setInterval(() => {
        if (done) {
          window.clearInterval(keepalive);
          return;
        }
        try {
          if (synth.speaking && !synth.paused) {
            synth.pause();
            synth.resume();
          }
        } catch {
          // ignore
        }
      }, 8000);

      // Safety timer: estimate the read-aloud duration and force-resolve
      // if onend is swallowed by the engine.
      const wordsPerSec = 2.5;
      const wordCount = Math.max(1, text.trim().split(/\s+/).length);
      const expectedMs = (wordCount / wordsPerSec) * 1000;
      window.setTimeout(() => {
        window.clearInterval(keepalive);
        finalize();
      }, expectedMs + 5000);
    }

    if (synth.getVoices().length === 0) {
      const onVoicesChanged = () => {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        fire();
      };
      synth.addEventListener("voiceschanged", onVoicesChanged);
      // Fallback if voiceschanged never fires.
      window.setTimeout(() => {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        fire();
      }, 1500);
    } else {
      fire();
    }
  });
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
