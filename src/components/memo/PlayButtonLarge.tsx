"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { isPlaceholderAudio, loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject, TranscriptBlock } from "@/lib/types";
import { log } from "@/lib/log";

// Large play button + waveform. Sits above the transcript on the Memo View.
// SPEC §13's emotional payload (step 8) depends on this being immediately
// findable — see DESIGN.md "Do's".
//
// CRITICAL: Audio access goes through playMemo() in lib/privacy.ts. The full
// recording always goes through that gate. Per-turn question blobs only load
// AFTER the gate has authorised the viewer.
//
// Playback model
// --------------
// A finished memo carries:
//   1. `audioBlobKey`           — one continuous mic recording (the whole
//                                 answer track, no questions).
//   2. `questionAudioBlobKeys`  — per-question rendered TTS (recorder voice
//                                 clone, or empty if the API failed).
//   3. transcript[].startMs/endMs on `recorder` blocks — the time range
//                                 inside the mic recording that maps to that
//                                 turn's answer.
//
// We *do not* slice the mic recording into per-turn webm blobs. Webm
// requires the init segment in chunk 0; later chunks are headerless and
// won't decode standalone. Instead the listen page seeks within the single
// blob using transcript timings.
//
// Playback walks the transcript in order:
//
//     interviewer block → speak-blob (rendered Q) or speak-tts (fallback)
//     recorder block    → play-segment (seek main audio to [startMs, endMs])
//
// → "question, answer, question, answer..." in true back-and-forth.
//
// Older memos / corrupted timings fall through to legacy modes:
//   "audio"  – play full mic blob start-to-finish, no questions.
//   "tts"    – speak the whole transcript via SpeechSynthesis.

type Step =
  | { kind: "speak-blob"; url: string }
  | { kind: "speak-tts"; text: string }
  | { kind: "play-segment"; startMs: number; endMs: number };

export function PlayButtonLarge({
  memo,
  family,
  viewer,
}: {
  memo: Memo;
  family: Family;
  viewer: Subject;
}) {
  // Two audio elements: one for the main mic blob (seeked into for answers),
  // one for the rendered-question blobs. Keeping them split means setting a
  // question's src never disturbs the main blob's currentTime.
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const qAudioRef = useRef<HTMLAudioElement | null>(null);

  const cursorRef = useRef(0);
  // Set true the moment the user pauses or the component unmounts. All
  // outstanding callbacks (timeupdate, utterance.onend, etc.) bail without
  // advancing when this is true. Without it, a TTS onend fired *after* a
  // pause click would helpfully resume playback at the next step.
  const stoppedRef = useRef(true);

  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [legacyMode, setLegacyMode] = useState<"audio" | "tts" | null>(null);

  const interviewerCount = useMemo(
    () => memo.transcript.filter((b) => b.speaker === "interviewer").length,
    [memo.transcript],
  );

  // ── Load audio + build step plan ────────────────────────────────────────
  useEffect(() => {
    const revokeUrls: string[] = [];
    let cancelled = false;
    cursorRef.current = 0;
    stoppedRef.current = true;

    void (async () => {
      try {
        const fullBlob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;

        const placeholder = isPlaceholderAudio(fullBlob);
        let mainUrl: string | null = null;
        if (!placeholder) {
          mainUrl = URL.createObjectURL(fullBlob);
          revokeUrls.push(mainUrl);
        }
        // Wire the main audio src ONCE via ref. Do NOT pass src as a JSX
        // prop — React will reconcile it back to "" on subsequent renders
        // and tear playback to bits.
        if (mainAudioRef.current && mainUrl) {
          mainAudioRef.current.src = mainUrl;
          mainAudioRef.current.preload = "auto";
        }

        const questionUrls = await loadKeyArray(
          family.id,
          memo.questionAudioBlobKeys ?? [],
        );
        if (cancelled) return;
        for (const u of questionUrls) if (u) revokeUrls.push(u);

        const recorderBlocks = memo.transcript.filter(
          (b) => b.speaker === "recorder",
        );
        const hasTimings = recorderBlocks.some((b) => b.endMs > b.startMs);

        if (!hasTimings || memo.transcript.length === 0) {
          if (placeholder) {
            setLegacyMode("tts");
            return;
          }
          setLegacyMode("audio");
          return;
        }

        const built: Step[] = [];
        let qIdx = 0;
        for (const block of memo.transcript) {
          if (block.speaker === "interviewer") {
            const url = questionUrls[qIdx++] ?? null;
            built.push(
              url
                ? { kind: "speak-blob", url }
                : { kind: "speak-tts", text: block.text },
            );
          } else {
            if (!placeholder && block.endMs > block.startMs) {
              built.push({
                kind: "play-segment",
                startMs: block.startMs,
                endMs: block.endMs,
              });
            } else {
              built.push({ kind: "speak-tts", text: block.text });
            }
          }
        }

        if (built.length === 0) {
          setLegacyMode(placeholder ? "tts" : "audio");
          return;
        }

        setSteps(built);
      } catch (err) {
        log.warn("PlayButtonLarge", "could not load audio", err);
        if (!cancelled) setErrored(true);
      }
    })();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      stopAllSilent();
      for (const u of revokeUrls) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id, family.id, viewer.id]);

  function stopAllSilent() {
    if (mainAudioRef.current) {
      try {
        mainAudioRef.current.pause();
      } catch {
        // ignore
      }
    }
    if (qAudioRef.current) {
      try {
        qAudioRef.current.pause();
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  // ── Mode A: legacy single-blob audio ─────────────────────────────────────
  function toggleLegacyAudio() {
    const a = mainAudioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      const onLegacyEnded = () => {
        a.removeEventListener("ended", onLegacyEnded);
        setPlaying(false);
      };
      a.addEventListener("ended", onLegacyEnded);
      void a.play().catch(() => setErrored(true));
      setPlaying(true);
    }
  }

  // ── Mode B: legacy TTS the whole transcript ──────────────────────────────
  function toggleLegacyTts() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrored(true);
      return;
    }
    const synth = window.speechSynthesis;
    if (playing) {
      stoppedRef.current = true;
      synth.cancel();
      setPlaying(false);
      return;
    }
    stoppedRef.current = false;
    setPlaying(true);

    const blocks: TranscriptBlock[] = memo.transcript.length
      ? memo.transcript
      : [
          {
            speaker: "recorder",
            text: memo.rawTranscript || memo.topic,
            startMs: 0,
            endMs: 0,
          },
        ];

    let i = 0;
    function speakNext() {
      if (stoppedRef.current) return;
      if (i >= blocks.length) {
        setPlaying(false);
        return;
      }
      const b = blocks[i++];
      const u = new SpeechSynthesisUtterance(b.text);
      u.rate = b.speaker === "interviewer" ? 0.95 : 0.92;
      u.pitch = b.speaker === "interviewer" ? 1.08 : 0.96;
      u.onend = speakNext;
      u.onerror = () => setPlaying(false);
      synth.speak(u);
    }
    speakNext();
  }

  // ── Mode C: interleaved per-turn playback ────────────────────────────────
  function toggleSegmented() {
    if (!steps) return;
    if (playing) {
      stoppedRef.current = true;
      stopAllSilent();
      setPlaying(false);
      return;
    }
    stoppedRef.current = false;
    setPlaying(true);
    runStepAt(cursorRef.current >= steps.length ? 0 : cursorRef.current);
  }

  function runStepAt(index: number) {
    if (!steps) return;
    if (stoppedRef.current) return;
    if (index >= steps.length) {
      cursorRef.current = 0;
      setPlaying(false);
      return;
    }
    cursorRef.current = index;
    const step = steps[index];

    const advance = () => {
      if (stoppedRef.current) return;
      runStepAt(index + 1);
    };

    if (step.kind === "play-segment") {
      const a = mainAudioRef.current;
      if (!a || !a.src) {
        advance();
        return;
      }
      const startSec = step.startMs / 1000;
      const endSec = step.endMs / 1000;

      const onTimeUpdate = () => {
        if (a.currentTime >= endSec - 0.04) {
          a.removeEventListener("timeupdate", onTimeUpdate);
          a.removeEventListener("ended", onEnded);
          try {
            a.pause();
          } catch {
            // ignore
          }
          advance();
        }
      };
      const onEnded = () => {
        a.removeEventListener("timeupdate", onTimeUpdate);
        a.removeEventListener("ended", onEnded);
        advance();
      };

      // Only seek if we're outside the segment. Pause-resume keeps position.
      if (a.currentTime < startSec || a.currentTime >= endSec) {
        try {
          a.currentTime = startSec;
        } catch {
          // ignore
        }
      }
      a.addEventListener("timeupdate", onTimeUpdate);
      a.addEventListener("ended", onEnded);

      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          a.removeEventListener("timeupdate", onTimeUpdate);
          a.removeEventListener("ended", onEnded);
          advance();
        });
      }
      return;
    }

    if (step.kind === "speak-blob") {
      const t = qAudioRef.current;
      if (!t) {
        advance();
        return;
      }
      const onQEnded = () => {
        t.removeEventListener("ended", onQEnded);
        t.removeEventListener("error", onQError);
        advance();
      };
      const onQError = () => {
        t.removeEventListener("ended", onQEnded);
        t.removeEventListener("error", onQError);
        advance();
      };
      t.src = step.url;
      t.addEventListener("ended", onQEnded);
      t.addEventListener("error", onQError);
      const p = t.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          t.removeEventListener("ended", onQEnded);
          t.removeEventListener("error", onQError);
          advance();
        });
      }
      return;
    }

    // speak-tts (no synth.cancel() mid-chain — that breaks Chrome's queue)
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      advance();
      return;
    }
    const text = (step.text || "").trim();
    if (!text) {
      advance();
      return;
    }
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /samantha|google us english|natural/i.test(v.name)) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
      voices[0];
    if (preferred) u.voice = preferred;
    u.onend = advance;
    u.onerror = advance;
    synth.speak(u);
  }

  const onClick = steps
    ? toggleSegmented
    : legacyMode === "audio"
      ? toggleLegacyAudio
      : legacyMode === "tts"
        ? toggleLegacyTts
        : undefined;
  const ready = !!steps || !!legacyMode;
  const disabled = errored || !ready;

  return (
    <div className="flex flex-col items-center gap-md">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <FauxWaveform playing={playing} />

      {/* Refs only — never pass `src` as a JSX prop or React will reconcile
          it away mid-playback. */}
      <audio ref={mainAudioRef} preload="auto" />
      <audio ref={qAudioRef} preload="auto" />

      {steps && interviewerCount > 0 && (
        <p className="type-metadata text-ink-tertiary text-center reading-width">
          {interviewerCount === 1 ? "1 question" : `${interviewerCount} questions`}{" "}
          and answers, played back in order.
        </p>
      )}
      {legacyMode === "tts" && (
        <p className="type-metadata text-ink-tertiary text-center reading-width">
          Recorded audio isn&apos;t staged for this memo — playing the
          transcript with the browser&apos;s voice.
        </p>
      )}
      {errored && (
        <p className="type-metadata text-ink-tertiary text-center">
          Audio playback isn&apos;t available in this browser.
        </p>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function loadKeyArray(
  familyId: string,
  keys: string[],
): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (const k of keys) {
    if (!k) {
      out.push(null);
      continue;
    }
    try {
      const blob = await loadAudioBlob(familyId, k);
      if (!blob || blob.size < 256 || isPlaceholderAudio(blob)) {
        out.push(null);
        continue;
      }
      out.push(URL.createObjectURL(blob));
    } catch {
      out.push(null);
    }
  }
  return out;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <rect x="6" y="5" width="4" height="14" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" fill="currentColor" />
    </svg>
  );
}

// Static decorative waveform — real waveform rendering is stretch (PLAN §11
// Phase N). Even non-animated, the visual marker reads as "audio lives here."
function FauxWaveform({ playing }: { playing: boolean }) {
  const heights = [12, 28, 18, 36, 24, 40, 22, 32, 18, 28, 14, 32, 22, 38, 18, 26, 14, 22, 30, 18, 26, 14];
  return (
    <div className="flex h-12 items-end gap-[3px]">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-foliage-deep/55 transition-opacity ${
            playing ? "opacity-100" : "opacity-60"
          }`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
