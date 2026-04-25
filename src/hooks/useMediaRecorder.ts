"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { log } from "@/lib/log";

export type RecorderState = "idle" | "requesting" | "recording" | "paused" | "stopped" | "denied";

export function useMediaRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Cursor into chunksRef that snapshot() advances each time it's called.
  // This lets the consumer slice "audio since the last turn" cleanly while
  // the same MediaRecorder keeps a single contiguous recording for the
  // final memo file.
  const snapshotCursorRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const start = useCallback(async () => {
    setState("requesting");
    setBlob(null);
    chunksRef.current = [];
    snapshotCursorRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: pickMime() });
      mr.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      });
      mr.addEventListener("stop", () => {
        const out = new Blob(chunksRef.current, { type: mr.mimeType });
        setBlob(out);
      });
      // 1s timeslice gives us frequent dataavailable events so a turn
      // snapshot is never empty even if the user clicks "Next question"
      // very early.
      mr.start(1_000);
      recorderRef.current = mr;
      startedAtRef.current = performance.now();
      tickRef.current = window.setInterval(() => {
        setDurationMs(performance.now() - startedAtRef.current);
      }, 250);
      setState("recording");
    } catch (err) {
      log.warn("recorder", "getUserMedia denied or failed", err);
      setState("denied");
    }
  }, []);

  const pause = useCallback(() => {
    recorderRef.current?.pause();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    recorderRef.current?.resume();
    setState("recording");
  }, []);

  const stop = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setState("stopped");
  }, []);

  // Returns a Blob of audio captured since the last call to snapshot() (or
  // since recording started, if this is the first call). Blocking on a
  // forced flush so we never miss the last partial chunk.
  const snapshot = useCallback(async (): Promise<Blob | null> => {
    const mr = recorderRef.current;
    if (!mr) return null;
    try {
      const flushed = new Promise<void>((resolve) => {
        const onData = () => {
          mr.removeEventListener("dataavailable", onData);
          resolve();
        };
        mr.addEventListener("dataavailable", onData);
        mr.requestData();
        // Defensive timeout — some browsers fire dataavailable lazily.
        window.setTimeout(() => {
          mr.removeEventListener("dataavailable", onData);
          resolve();
        }, 500);
      });
      await flushed;
    } catch {
      // ignore — fall through with whatever chunks we already have
    }
    const all = chunksRef.current;
    const slice = all.slice(snapshotCursorRef.current);
    snapshotCursorRef.current = all.length;
    if (slice.length === 0) return null;
    return new Blob(slice, { type: mr.mimeType || "audio/webm" });
  }, []);

  useEffect(() => () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { state, durationMs, blob, start, pause, resume, stop, snapshot };
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
