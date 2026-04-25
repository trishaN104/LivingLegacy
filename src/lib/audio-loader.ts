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
};

// Marker MIME so callers can recognize "the asset is not staged; please use
// the TTS fallback path." `<audio>` elements still play these — they're
// valid silent WAVs — but the consumer can choose to read out the transcript
// instead, which is how the demo path actually communicates content when
// the recorded mp3 is missing.
const PLACEHOLDER_MIME = "audio/wav";
const PLACEHOLDER_FLAG = "x-kin-placeholder";

export function isPlaceholderAudio(blob: Blob): boolean {
  // Both branches end up here: the silent WAV we manufacture, and any
  // non-blob fallback. Blob names aren't preserved across createObjectURL,
  // so we encode the flag in the blob's `type` instead.
  return blob.type.includes(PLACEHOLDER_FLAG);
}

export async function loadAudioBlob(familyId: string, key: string): Promise<Blob> {
  if (key.startsWith("demo:")) {
    const url = DEMO_KEYS[key];
    if (!url) {
      log.warn("audio-loader", `unknown demo audio key: ${key}`);
      return placeholderSilence();
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`demo audio fetch ${url} -> ${res.status}`);
      return await res.blob();
    } catch (err) {
      log.warn("audio-loader", `demo asset missing for key=${key}`, err);
      return placeholderSilence();
    }
  }
  try {
    return await getAudioBlob(familyId, key);
  } catch (err) {
    log.warn("audio-loader", `idb miss for key=${key}`, err);
    return placeholderSilence();
  }
}

// Valid 1-second silent mono 8kHz 16-bit PCM WAV. Browsers play it without
// error and report a real duration; users hear nothing — which matches the
// honest signal "the asset is not staged."
function placeholderSilence(): Blob {
  const sampleRate = 8000;
  const seconds = 1;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  // PCM samples already zero-initialized.

  return new Blob([buffer], { type: `${PLACEHOLDER_MIME}; ${PLACEHOLDER_FLAG}` });
}
