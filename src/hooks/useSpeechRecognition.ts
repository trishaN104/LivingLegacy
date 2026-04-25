"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { log } from "@/lib/log";

// Live in-browser speech-to-text using the Web Speech API. Works in Chrome,
// Edge, Safari, and Brave today. We use it to feed the interviewer model what
// the recorder just said — without it, every turn looks identical to the LLM
// because we have no transcript yet (Whisper only runs at finalization).
//
// Falls back gracefully when the browser doesn't support it: the consumer
// gets `supported = false` and an empty transcript; the interviewer still
// adapts based on its own previously-asked questions.

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const finalsRef = useRef<string>("");
  const wantOnRef = useRef(false);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (recogRef.current) return;
    finalsRef.current = "";
    setTranscript("");
    wantOnRef.current = true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          finalsRef.current = (finalsRef.current + " " + text).trim();
        } else {
          interim += text;
        }
      }
      const merged = (finalsRef.current + " " + interim).trim();
      setTranscript(merged);
    };
    rec.onerror = (e) => {
      log.warn("speech-recognition", "error", e.error);
    };
    rec.onend = () => {
      if (wantOnRef.current) {
        try {
          rec.start();
        } catch (err) {
          log.warn("speech-recognition", "auto-restart failed", err);
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    try {
      rec.start();
      recogRef.current = rec;
      setListening(true);
    } catch (err) {
      log.warn("speech-recognition", "start failed", err);
    }
  }, []);

  const stop = useCallback(() => {
    wantOnRef.current = false;
    const rec = recogRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
    recogRef.current = null;
  }, []);

  // Returns the text captured since the last call and clears the buffer, so
  // each interview turn gets a clean slice of "what the recorder just said".
  const drainSince = useCallback((from: number): string => {
    const all = (finalsRef.current + "").trim();
    return all.slice(from).trim();
  }, []);

  const drainAll = useCallback((): string => {
    const all = finalsRef.current.trim();
    finalsRef.current = "";
    setTranscript("");
    return all;
  }, []);

  useEffect(() => {
    return () => {
      wantOnRef.current = false;
      try {
        recogRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  return { supported, listening, transcript, start, stop, drainSince, drainAll };
}
