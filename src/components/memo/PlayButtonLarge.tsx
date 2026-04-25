"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { isPlaceholderAudio, loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject, TranscriptBlock } from "@/lib/types";
import { log } from "@/lib/log";

// Memo listen-page playback. Walks the transcript in order:
//
//   interviewer block → SpeechSynthesis (browser voice) speaks the question
//   recorder block    → seek inside the single mic blob to [startMs, endMs]
//                       and play that slice
//
// One <audio> element. Its src is wired ONCE through the ref — never via
// a JSX prop — because React reconciles the src attribute back to "" on
// every re-render, which previously stomped playback mid-walk.
//
// SpeechSynthesis.cancel() is NEVER called between utterances in the chain.
// Chrome's queue gets confused by cancel→speak in quick succession and the
// next utterance silently never speaks. cancel() only fires on user pause
// or unmount.
//
// If the recorder transcript blocks lack real per-turn timings (older
// memos saved before turnBoundariesMs existed), we fall back to playing
// the full mic blob continuously without questions — the recording is
// always audible no matter what.

type Step =
  | { kind: "tts"; text: string }
  | { kind: "audio"; startMs: number; endMs: number };

export function PlayButtonLarge({
  memo,
  family,
  viewer,
}: {
  memo: Memo;
  family: Family;
  viewer: Subject;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppedRef = useRef(true);
  const cursorRef = useRef(0);

  const [audioReady, setAudioReady] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  // Mode `legacy-audio` → no per-turn timings, just play the whole blob.
  // Mode `legacy-tts`   → no audio asset, speak the transcript instead.
  const [mode, setMode] = useState<"interleaved" | "legacy-audio" | "legacy-tts" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  const interviewerCount = useMemo(
    () => memo.transcript.filter((b) => b.speaker === "interviewer").length,
    [memo.transcript],
  );

  // ── Load audio + build step plan ────────────────────────────────────────
  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    cursorRef.current = 0;
    stoppedRef.current = true;
    setPlaying(false);
    setSteps(null);
    setMode(null);
    setAudioReady(false);

    void (async () => {
      try {
        const blob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;

        const placeholder = isPlaceholderAudio(blob) || blob.size < 256;

        if (placeholder) {
          // No real recording → speak the whole transcript.
          setMode("legacy-tts");
          return;
        }

        const url = URL.createObjectURL(blob);
        revoke = url;
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.preload = "auto";
        }
        setAudioReady(true);

        // Decide whether transcript timings are real per-turn boundaries
        // or stubs. Real timings cover the vast majority of the recording;
        // stubs are 1 s wide each from old finalize().
        const recBlocks = memo.transcript.filter((b) => b.speaker === "recorder");
        const totalMs = (memo.durationSeconds || 0) * 1000;
        const lastRec = recBlocks[recBlocks.length - 1];
        const haveRealTimings =
          !!lastRec &&
          lastRec.endMs > lastRec.startMs &&
          (totalMs === 0 || lastRec.endMs >= totalMs * 0.5);

        if (!haveRealTimings || memo.transcript.length === 0) {
          setMode("legacy-audio");
          return;
        }

        const built: Step[] = [];
        for (const block of memo.transcript) {
          if (block.speaker === "interviewer") {
            const text = (block.text || "").trim();
            if (text) built.push({ kind: "tts", text });
          } else if (block.endMs > block.startMs) {
            built.push({
              kind: "audio",
              startMs: block.startMs,
              endMs: block.endMs,
            });
          }
        }

        if (built.length === 0) {
          setMode("legacy-audio");
          return;
        }

        setSteps(built);
        setMode("interleaved");
      } catch (err) {
        log.warn("PlayButtonLarge", "could not load audio", err);
        if (!cancelled) setErrored(true);
      }
    })();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
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
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id, family.id, viewer.id]);

  // ── legacy-audio mode wiring (full mic blob continuous) ─────────────────
  useEffect(() => {
    if (mode !== "legacy-audio") return;
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onErr = () => setErrored(true);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onErr);
    };
  }, [mode]);

  // ── controls ────────────────────────────────────────────────────────────
  function stopEverything() {
    stoppedRef.current = true;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
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

  function toggleLegacyAudio() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      stoppedRef.current = false;
      void a.play().catch(() => setErrored(true));
    } else {
      stoppedRef.current = true;
      a.pause();
    }
  }

  function toggleLegacyTts() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrored(true);
      return;
    }
    const synth = window.speechSynthesis;
    if (playing) {
      stopEverything();
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
      if (!b.text || !b.text.trim()) {
        speakNext();
        return;
      }
      const u = new SpeechSynthesisUtterance(b.text);
      u.rate = b.speaker === "interviewer" ? 0.95 : 0.92;
      u.pitch = b.speaker === "interviewer" ? 1.08 : 0.96;
      u.onend = speakNext;
      u.onerror = () => setPlaying(false);
      synth.speak(u);
    }
    speakNext();
  }

  function toggleInterleaved() {
    if (!steps) return;
    if (playing) {
      stopEverything();
      setPlaying(false);
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // No TTS available → play just the audio segments.
      stoppedRef.current = false;
      setPlaying(true);
      runStepAt(audioOnlyIndex(steps, 0));
      return;
    }
    stoppedRef.current = false;
    setPlaying(true);
    const start = cursorRef.current >= steps.length ? 0 : cursorRef.current;
    runStepAt(start);
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

    if (step.kind === "audio") {
      const a = audioRef.current;
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

      // Resume keeps position if currentTime is still inside the segment.
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

    // tts (no synth.cancel() — that breaks Chrome's queue mid-chain)
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      advance();
      return;
    }
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(step.text);
    u.rate = 0.95;
    u.pitch = 1.08;
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

  const onClick =
    mode === "interleaved"
      ? toggleInterleaved
      : mode === "legacy-audio"
        ? toggleLegacyAudio
        : mode === "legacy-tts"
          ? toggleLegacyTts
          : undefined;
  const ready = mode === "legacy-tts" ? true : !!mode && (mode !== "legacy-audio" || audioReady);
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

      {/* Refs only — never set src as a JSX prop or React reconciles it
          back to empty mid-playback. */}
      <audio ref={audioRef} preload="auto" />

      {mode === "interleaved" && interviewerCount > 0 && (
        <p className="type-metadata text-ink-tertiary text-center reading-width">
          {interviewerCount === 1 ? "1 question" : `${interviewerCount} questions`}{" "}
          and answers, played back in order.
        </p>
      )}
      {mode === "legacy-tts" && (
        <p className="type-metadata text-ink-tertiary text-center reading-width">
          The recorded audio for this memo isn&apos;t staged yet — playing
          the transcript with the browser&apos;s voice instead.
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

// If TTS isn't available, skip past tts steps to find the next audio one.
function audioOnlyIndex(steps: Step[], from: number): number {
  for (let i = from; i < steps.length; i++) {
    if (steps[i].kind === "audio") return i;
  }
  return steps.length;
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
