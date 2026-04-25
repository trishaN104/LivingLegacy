// Centralized audio-blob resolver.
//
// Memo audio lives in two places:
//   - IndexedDB (recorded by users in non-demo flows) — keys are opaque UUIDs.
//   - Static /public/seed/demo-memo/ assets (the §13 scripted memo) — keys
//     begin with "demo:" and resolve to URLs under DEMO_AUDIO.
//
// playMemo() in lib/privacy.ts accepts this loader as a dependency injection.
// Components must always go through privacy.ts — never call this directly.

"use client";

import { DEMO_AUDIO, DEMO_MEMO_ID } from "./demo";
import { getAudioBlob } from "./storage";
import { log } from "./log";

const DEMO_KEYS: Record<string, string> = {
  [`demo:${DEMO_MEMO_ID}:full-playback`]: DEMO_AUDIO.fullPlayback,
  [`demo:${DEMO_MEMO_ID}:q1-ma-voice`]: DEMO_AUDIO.questionsInRecorderVoice[0],
  [`demo:${DEMO_MEMO_ID}:q2-ma-voice`]: DEMO_AUDIO.questionsInRecorderVoice[1],
  [`demo:${DEMO_MEMO_ID}:q3-ma-voice`]: DEMO_AUDIO.questionsInRecorderVoice[2],
  [`demo:${DEMO_MEMO_ID}:q4-ma-voice`]: DEMO_AUDIO.questionsInRecorderVoice[3],
};

export async function loadAudioBlob(familyId: string, key: string): Promise<Blob> {
  if (key.startsWith("demo:")) {
    const url = DEMO_KEYS[key];
    if (!url) throw new Error(`unknown demo audio key: ${key}`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`demo audio fetch ${url} -> ${res.status}`);
      return await res.blob();
    } catch (err) {
      // Demo asset not yet staged — return a tiny silent placeholder so the
      // UI still renders. PRE.2 supplies the real audio.
      log.warn("audio-loader", `demo asset missing for key=${key}`, err);
      return placeholderSilence();
    }
  }
  return getAudioBlob(familyId, key);
}

function placeholderSilence(): Blob {
  // 1-second silent MP3 (smallest valid frame). Browsers play this without
  // erroring; users hear nothing — which is honest about the missing asset.
  return new Blob([new Uint8Array([0xff, 0xfb, 0x90, 0x44, 0x00])], {
    type: "audio/mpeg",
  });
}
