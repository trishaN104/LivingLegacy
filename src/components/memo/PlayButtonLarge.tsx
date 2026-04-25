"use client";

import { useEffect, useRef, useState } from "react";
import { playMemo } from "@/lib/privacy";
import { loadAudioBlob } from "@/lib/audio-loader";
import type { Family, Memo, Subject } from "@/lib/types";
import { log } from "@/lib/log";

// Large play button + waveform. Sits above the transcript on the Memo View.
// SPEC §13's emotional payload (step 8) depends on this being immediately
// findable — see DESIGN.md "Do's".
//
// CRITICAL: Audio access goes through playMemo() in lib/privacy.ts. This
// component MUST NOT read memo.audioBlobKey directly.

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

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const blob = await playMemo(viewer, memo, family, (key) =>
          loadAudioBlob(family.id, key),
        );
        if (cancelled) return;
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

  function toggle() {
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

  return (
    <div className="flex flex-col items-center gap-md">
      <button
        type="button"
        onClick={toggle}
        disabled={!audioUrl || errored}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform hover:-translate-y-0.5 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
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
      {errored && (
        <p className="type-metadata text-ink-tertiary">
          The audio file isn't staged yet — check public/seed/demo-memo/.
        </p>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
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
