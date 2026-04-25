"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { isPlaceholderAudio, loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject, TranscriptBlock } from "@/lib/types";
import { log } from "@/lib/log";

// Memo listen-page playback. Walks the transcript in order:
//
//   interviewer block → speak the question through a TTS step. We prefer
//                       the pre-rendered ElevenLabs blob (in the recorder's
//                       cloned voice) if one was saved at finalize time;
//                       otherwise we fall through to the browser's
//                       SpeechSynthesis, with the standard Chrome quirks
//                       worked around (see speakUtterance below).
//   recorder block    → seek inside the single mic blob to [startMs, endMs]
//                       and play that slice.
//
// audio.src for the mic blob is wired ONCE through the ref. The
// pre-rendered question blobs play through a SECOND <audio> element so
// switching question src never disturbs the mic blob's currentTime.
// Neither element gets `src` as a JSX prop — React reconciles src back
// to "" on every re-render and that was the silent-pause culprit.
//
// SpeechSynthesis is brittle on Chrome:
//   - First utterance after page load is dropped if voices aren't loaded.
//   - onend doesn't always fire (esp. for utterances cancelled by another
//     speak()).
//   - cancel() right before speak() can drop the next speak().
//
// speakUtterance handles all of those: it waits for voices, sets lang
// explicitly, and arms a duration-based safety timer that force-advances
// the chain if onend never fires.

type Step =
  | { kind: "tts"; text: string }
  | { kind: "qaudio"; url: string } // pre-rendered question blob (ElevenLabs)
  | { kind: "audio"; startMs: number; endMs: number }; // mic blob seek

type Mode = "interleaved" | "legacy-audio" | "legacy-tts" | null;

export function PlayButtonLarge({
  memo,
  family,
  viewer,
}: {
  memo: Memo;
  family: Family;
  viewer: Subject;
}) {
  const micAudioRef = useRef<HTMLAudioElement | null>(null);
  const qAudioRef = useRef<HTMLAudioElement | null>(null);
  const stoppedRef = useRef(true);
  const cursorRef = useRef(0);

  const [steps, setSteps] = useState<Step[] | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

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
    setPlaying(false);
    setSteps(null);
    setMode(null);

    void (async () => {
      try {
        const blob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;

        const placeholder = isPlaceholderAudio(blob) || blob.size < 256;

        if (placeholder) {
          setMode("legacy-tts");
          return;
        }

        // Wire the mic blob src ONCE via ref.
        const micUrl = URL.createObjectURL(blob);
        revokeUrls.push(micUrl);
        if (micAudioRef.current) {
          micAudioRef.current.src = micUrl;
          micAudioRef.current.preload = "auto";
        }

        // Load any rendered question blobs (ElevenLabs cloned voice). These
        // are best-effort; missing/placeholder entries fall back to TTS.
        const questionUrls = await loadKeyArray(
          family.id,
          memo.questionAudioBlobKeys ?? [],
        );
        if (cancelled) return;
        for (const u of questionUrls) if (u) revokeUrls.push(u);

        // Decide whether transcript timings are real per-turn boundaries
        // or stubs from old finalize().
        const recBlocks = memo.transcript.filter(
          (b) => b.speaker === "recorder",
        );
        const totalMs = (memo.durationSeconds || 0) * 1000;
        const lastRec = recBlocks[recBlocks.length - 1];
        const haveRealTimings =
          !!lastRec &&
          lastRec.endMs > lastRec.startMs &&
          (totalMs === 0 || lastRec.endMs >= totalMs * 0.4);

        if (!haveRealTimings || memo.transcript.length === 0) {
          setMode("legacy-audio");
          return;
        }

        const built: Step[] = [];
        let qIdx = 0;
        for (const block of memo.transcript) {
          if (block.speaker === "interviewer") {
            const text = (block.text || "").trim();
            const url = questionUrls[qIdx++] ?? null;
            if (url) {
              built.push({ kind: "qaudio", url });
            } else if (text) {
              built.push({ kind: "tts", text });
            }
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
      if (micAudioRef.current) {
        try {
          micAudioRef.current.pause();
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
      for (const u of revokeUrls) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id, family.id, viewer.id]);

  // ── legacy-audio mode wiring ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "legacy-audio") return;
    const a = micAudioRef.current;
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
    if (micAudioRef.current) {
      try {
        micAudioRef.current.pause();
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

  function toggleLegacyAudio() {
    const a = micAudioRef.current;
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
      const text = (b.text || "").trim();
      if (!text) {
        speakNext();
        return;
      }
      speakUtterance(text, stoppedRef, () => {
        if (stoppedRef.current) return;
        speakNext();
      });
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
      const a = micAudioRef.current;
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

    if (step.kind === "qaudio") {
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

    // tts
    speakUtterance(step.text, stoppedRef, advance);
  }

  const onClick =
    mode === "interleaved"
      ? toggleInterleaved
      : mode === "legacy-audio"
        ? toggleLegacyAudio
        : mode === "legacy-tts"
          ? toggleLegacyTts
          : undefined;
  const ready = !!mode;
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

      {/* Refs only — never set src as a JSX prop. */}
      <audio ref={micAudioRef} preload="auto" />
      <audio ref={qAudioRef} preload="auto" />

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

// Robust SpeechSynthesis utterance for Chrome. Calls `onDone` exactly once,
// no matter what — including when Chrome silently swallows onend.
function speakUtterance(
  text: string,
  stoppedRef: React.RefObject<boolean>,
  onDone: () => void,
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone();
    return;
  }
  const synth = window.speechSynthesis;

  let done = false;
  const finalize = () => {
    if (done) return;
    done = true;
    if (!stoppedRef.current) onDone();
  };

  function fire() {
    if (stoppedRef.current) {
      finalize();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 1.0;

    const voices = synth.getVoices();
    const en =
      voices.find((v) => /samantha|google us english natural/i.test(v.name)) ??
      voices.find(
        (v) => v.default && v.lang?.toLowerCase().startsWith("en"),
      ) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
      voices[0];
    if (en) u.voice = en;

    u.onend = finalize;
    u.onerror = finalize;

    synth.speak(u);

    // Safety timer: Chrome occasionally never fires onend. Force-advance
    // after an estimated read-aloud duration.
    const wordsPerSec = 2.5; // ~150 wpm at rate 0.95
    const wordCount = Math.max(1, text.trim().split(/\s+/).length);
    const expectedMs = (wordCount / wordsPerSec) * 1000;
    setTimeout(finalize, expectedMs + 4000);
  }

  // Voices load async on Chrome. If they're not ready, the first speak()
  // is silently dropped. Wait for them (with a short fallback).
  if (synth.getVoices().length === 0) {
    const onVoicesChanged = () => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      fire();
    };
    synth.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      if (!done) fire();
    }, 400);
  } else {
    fire();
  }
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
