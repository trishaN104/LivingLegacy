// OpenAI Whisper STT wrapper. Used for memo transcription AND voice-mode
// command capture.

"use client";

import { isDemoMemo, isDemoMode, DEMO_TRANSCRIPT } from "./demo";
import { log } from "./log";

export async function transcribeAudio(args: {
  memoId: string;
  audioBlob: Blob;
  promptHint?: string; // bias prompt with member names + topic for accuracy
}): Promise<string> {
  if (isDemoMode() && isDemoMemo(args.memoId)) {
    return DEMO_TRANSCRIPT.filter((b) => b.speaker === "recorder")
      .map((b) => b.text)
      .join(" ");
  }
  try {
    const fd = new FormData();
    fd.append("audio", args.audioBlob, "memo.webm");
    if (args.promptHint) fd.append("prompt", args.promptHint);
    const res = await fetch("/api/whisper", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`whisper ${res.status}`);
    const j = (await res.json()) as { text: string };
    return j.text;
  } catch (err) {
    log.warn("whisper", "transcribe failed", err);
    return "";
  }
}
