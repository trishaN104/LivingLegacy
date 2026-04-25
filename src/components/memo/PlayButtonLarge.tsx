"use client";

import { useEffect, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { isPlaceholderAudio, loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject, TranscriptBlock } from "@/lib/types";
import { log } from "@/lib/log";

// Large play button + waveform on the memo listen page.
//
// Playback model — intentionally simple:
//
//   • Always play the recorder's continuous mic recording (audioBlobKey)
//     start-to-finish. No question interleaving on this surface.
//   • If there is no audio blob (placeholder), fall back to speaking the
//     transcript via the browser's SpeechSynthesis so the listener still
//     hears something.
//
// The interleave-with-rendered-questions experiment was removed: webm
// chunks captured per-turn don't decode standalone (only the first chunk
// has the init segment) and the React reconcile of <audio src> kept
// resetting playback mid-walk. The recorder's voice was never reliably
// audible. This component now does one thing: play the recording.

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"audio" | "tts" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  // Keep a hard-stop flag so a long TTS chain bails out the moment the
  // user pauses or unmounts.
  const stoppedRef = useRef(true);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    stoppedRef.current = true;

    void (async () => {
      try {
        const blob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;

        if (isPlaceholderAudio(blob) || blob.size < 256) {
          setMode("tts");
          return;
        }

        const url = URL.createObjectURL(blob);
        revoke = url;
        setAudioUrl(url);
        setMode("audio");
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.preload = "auto";
        }
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

  // Hook the audio element's events to drive the play/pause state once src
  // is set. We re-run when audioUrl changes (i.e. the blob has loaded).
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
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
  }, [audioUrl]);

  function toggleAudio() {
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

  function toggleTts() {
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
      ? memo.transcript.filter((b) => b.speaker === "recorder")
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
      u.rate = 0.95;
      u.pitch = 1.0;
      u.onend = speakNext;
      u.onerror = () => setPlaying(false);
      synth.speak(u);
    }
    speakNext();
  }

  const onClick =
    mode === "audio" ? toggleAudio : mode === "tts" ? toggleTts : undefined;
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

      {/* Refs only — never set src as a JSX prop or React reconciles it
          back to empty mid-playback. */}
      <audio ref={audioRef} preload="auto" />

      {mode === "tts" && (
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
