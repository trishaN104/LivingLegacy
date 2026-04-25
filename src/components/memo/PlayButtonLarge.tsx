"use client";

import { useEffect, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { isPlaceholderAudio, loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject } from "@/lib/types";
import { log } from "@/lib/log";

// Large play button + waveform. Sits above the transcript on the Memo View.
// SPEC §13's emotional payload (step 8) depends on this being immediately
// findable — see DESIGN.md "Do's".
//
// CRITICAL: Audio access goes through playMemo() in lib/privacy.ts. This
// component MUST NOT read memo.audioBlobKey directly.
//
// When the underlying asset is missing (the seeded demo mp3 isn't staged),
// the loader returns a valid silent WAV. We detect that and fall back to
// reading the transcript via the browser's SpeechSynthesis API so the demo
// still communicates content rather than playing one second of silence.

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
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [usePlaceholderTts, setUsePlaceholderTts] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const blob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;
        if (isPlaceholderAudio(blob)) {
          setUsePlaceholderTts(true);
          setAudioUrl(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        revoke = url;
        setAudioUrl(url);
      } catch (err) {
        log.warn("PlayButtonLarge", "could not load audio", err);
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [memo, family, viewer]);

  // Stop any in-flight TTS when this component unmounts or the memo changes.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [memo.id]);

  function toggleAudio() {
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

  function toggleTts() {
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

    const blocks = memo.transcript.length
      ? memo.transcript
      : [
          {
            speaker: "recorder" as const,
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
      u.onerror = () => {
        setPlaying(false);
      };
      synth.speak(u);
    }
    speakNext();
  }

  const onClick = usePlaceholderTts ? toggleTts : toggleAudio;
  const disabled = errored || (!audioUrl && !usePlaceholderTts);

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

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setPlaying(false)}
          onError={() => setErrored(true)}
          preload="auto"
        />
      )}

      {usePlaceholderTts && (
        <p className="type-metadata text-ink-tertiary text-center reading-width">
          Recorded audio isn't staged — playing the transcript with the
          browser's voice. Drop a real mp3 into{" "}
          <code className="rounded-sm bg-surface-elevated px-1">
            public/seed/demo-memo/
          </code>{" "}
          to hear it in the recorder's voice.
        </p>
      )}
      {errored && (
        <p className="type-metadata text-ink-tertiary text-center">
          Audio playback isn't available in this browser.
        </p>
      )}
    </div>
  );
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
