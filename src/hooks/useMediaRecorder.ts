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
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const start = useCallback(async () => {
    setState("requesting");
    setBlob(null);
    chunksRef.current = [];
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
      mr.start(30_000); // 30s chunks for crash resilience
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

  useEffect(() => () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { state, durationMs, blob, start, pause, resume, stop };
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
