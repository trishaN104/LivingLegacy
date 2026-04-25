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
// recording always goes through that gate. Per-turn question/answer blobs
// only load AFTER the gate has authorised the viewer.
//
// Playback model
// --------------
// A finished memo carries three things on disk:
//   1. `audioBlobKey`        — one continuous mic recording (the whole answer
//                              track, no questions).
//   2. `questionAudioBlobKeys` — per-question rendered TTS (recorder voice
//                              clone, or empty if the API failed).
//   3. `answerAudioBlobKeys`  — per-turn slices of the mic recording, one
//                              per question.
//
// Modern memos (have answerAudioBlobKeys) play as a true back-and-forth:
//
//     question[0] → answer[0] → question[1] → answer[1] → …
//
// Whenever a question audio blob is missing/empty we fall back to the
// browser's SpeechSynthesis API for that segment so the listener still hears
// the question. Older memos without per-turn slices fall through to the
// single-track playback that this component used to do.

type Segment =
  | { kind: "audio"; url: string }
  | { kind: "tts"; text: string };

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
  const cursorRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  // Set when we couldn't build a segmented playback at all and have to fall
  // back to the legacy single-blob playback (placeholder asset, missing
  // audioBlobKey, etc).
  const [legacyMode, setLegacyMode] = useState<"audio" | "tts" | null>(null);
  const [legacyAudioUrl, setLegacyAudioUrl] = useState<string | null>(null);

  const interviewerCount = useMemo(
    () => memo.transcript.filter((b) => b.speaker === "interviewer").length,
    [memo.transcript],
  );

  useEffect(() => {
    let revokeUrls: string[] = [];
    let cancelled = false;
    cursorRef.current = 0;

    void (async () => {
      try {
        // Authorize through the privacy gate first. If this throws we never
        // touch any of the per-turn blobs.
        const fullBlob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;

        const hasAnswerSlices =
          (memo.answerAudioBlobKeys?.filter(Boolean).length ?? 0) > 0;
        const hasQuestionAudio =
          (memo.questionAudioBlobKeys?.filter(Boolean).length ?? 0) > 0;

        // No usable per-turn slices → legacy single-blob playback.
        if (!hasAnswerSlices) {
          if (isPlaceholderAudio(fullBlob)) {
            setLegacyMode("tts");
            return;
          }
          const url = URL.createObjectURL(fullBlob);
          revokeUrls.push(url);
          setLegacyAudioUrl(url);
          setLegacyMode("audio");
          return;
        }

        // Build interleaved segments. We index questions by interviewer-turn
        // order and answers by question-turn order, both of which were
        // chosen at finalize time to line up with the transcript.
        const questionUrls = await loadKeyArray(
          family.id,
          memo.questionAudioBlobKeys ?? [],
        );
        if (cancelled) return;
        const answerUrls = await loadKeyArray(
          family.id,
          memo.answerAudioBlobKeys ?? [],
        );
        if (cancelled) return;
        revokeUrls = [...questionUrls, ...answerUrls].filter(
          (u): u is string => !!u,
        );

        const built = buildSegments({
          transcript: memo.transcript,
          questionUrls,
          answerUrls,
        });

        if (built.length === 0) {
          // Defensive: if for some reason we couldn't build anything, fall
          // back so the listener at least hears the recorder track.
          if (isPlaceholderAudio(fullBlob)) {
            setLegacyMode("tts");
            return;
          }
          const url = URL.createObjectURL(fullBlob);
          revokeUrls.push(url);
          setLegacyAudioUrl(url);
          setLegacyMode("audio");
          return;
        }

        setSegments(built);
      } catch (err) {
        log.warn("PlayButtonLarge", "could not load audio", err);
        if (!cancelled) setErrored(true);
      }
    })();

    return () => {
      cancelled = true;
      for (const u of revokeUrls) URL.revokeObjectURL(u);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [memo, family, viewer]);

  function stopAll() {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // ── Mode A: legacy single-blob audio ─────────────────────────────────────
  function toggleLegacyAudio() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play();
      setPlaying(true);
    }
  }

  // ── Mode B: legacy "no audio asset" → TTS the entire transcript ─────────
  function toggleLegacyTts() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrored(true);
      return;
    }
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    synth.cancel();
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
    if (!segments) return;
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    playSegmentAt(cursorRef.current >= segments.length ? 0 : cursorRef.current);
  }

  function playSegmentAt(index: number) {
    if (!segments) return;
    if (index >= segments.length) {
      cursorRef.current = 0;
      setPlaying(false);
      return;
    }
    cursorRef.current = index;
    const seg = segments[index];
    if (seg.kind === "audio") {
      const a = audioRef.current;
      if (!a) {
        cursorRef.current = index + 1;
        playSegmentAt(index + 1);
        return;
      }
      a.src = seg.url;
      a.onended = () => playSegmentAt(index + 1);
      a.onerror = () => playSegmentAt(index + 1);
      void a.play().catch(() => playSegmentAt(index + 1));
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      cursorRef.current = index + 1;
      playSegmentAt(index + 1);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(seg.text);
    u.rate = 0.95;
    u.pitch = 1.05;
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /samantha|google us english|natural/i.test(v.name)) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ??
      voices[0];
    if (preferred) u.voice = preferred;
    u.onend = () => playSegmentAt(index + 1);
    u.onerror = () => playSegmentAt(index + 1);
    synth.speak(u);
  }

  const onClick = segments
    ? toggleSegmented
    : legacyMode === "audio"
      ? toggleLegacyAudio
      : legacyMode === "tts"
        ? toggleLegacyTts
        : undefined;
  const ready = !!segments || !!legacyMode;
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

      {/* Single shared <audio> — segmented mode swaps `src`; legacy mode sets
          it once via `legacyAudioUrl`. */}
      <audio
        ref={audioRef}
        src={legacyAudioUrl ?? undefined}
        onEnded={legacyMode === "audio" ? () => setPlaying(false) : undefined}
        onError={legacyMode === "audio" ? () => setErrored(true) : undefined}
        preload="auto"
      />

      {segments && interviewerCount > 0 && (
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

function buildSegments({
  transcript,
  questionUrls,
  answerUrls,
}: {
  transcript: TranscriptBlock[];
  questionUrls: (string | null)[];
  answerUrls: (string | null)[];
}): Segment[] {
  const segs: Segment[] = [];
  let qIdx = 0;
  let aIdx = 0;
  for (const block of transcript) {
    if (block.speaker === "interviewer") {
      const url = questionUrls[qIdx++];
      segs.push(url ? { kind: "audio", url } : { kind: "tts", text: block.text });
    } else {
      const url = answerUrls[aIdx++];
      // Recorder blocks fall back to TTS only when we have absolutely no
      // mic audio for this turn — better than silently skipping the answer.
      segs.push(url ? { kind: "audio", url } : { kind: "tts", text: block.text });
    }
  }
  return segs;
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
