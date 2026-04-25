"use client";

// Download (.zip) action — PLAN §11 I.3.
//
// Bundles the memo's audio + verbatim transcript + metadata into a single
// .zip the viewer can keep on their own device. Audio access is privacy-gated
// through playMemo() — same gate as the Listen button.

import { useState } from "react";
import JSZip from "jszip";
import { playMemo } from "@/lib/privacy";
import { loadAudioBlob } from "@/lib/audio-loader";
import { subjectFor, type Family, type Memo, type Subject } from "@/lib/types";
import { log } from "@/lib/log";

export function DownloadMemoButton({
  memo,
  family,
  viewer,
}: {
  memo: Memo;
  family: Family;
  viewer: Subject;
}) {
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);

  async function download() {
    setBusy(true);
    setErrored(false);
    try {
      const blob = await playMemo(viewer, memo, family, (key) =>
        loadAudioBlob(family.id, key),
      );

      const zip = new JSZip();
      zip.file(`audio${audioExtension(blob.type)}`, blob);
      zip.file("transcript.txt", buildTranscriptText(memo, family));
      zip.file("memo.json", JSON.stringify(serializeMemo(memo, family), null, 2));
      zip.file("README.txt", buildReadme(memo, family));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugifyTitle(memo.topic)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      log.warn("DownloadMemoButton", "download failed", err);
      setErrored(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="rounded-full bg-surface-elevated px-lg py-md type-ui-md text-primary transition-colors hover:bg-surface disabled:opacity-50"
    >
      {busy ? "Preparing…" : errored ? "Couldn't prepare — try again" : "Download (.zip)"}
    </button>
  );
}

function audioExtension(mime: string): string {
  if (mime.includes("mpeg") || mime.includes("mp3")) return ".mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return ".m4a";
  if (mime.includes("webm")) return ".webm";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("wav")) return ".wav";
  return ".bin";
}

function buildTranscriptText(memo: Memo, family: Family): string {
  const recorderName = subjectFor(family, memo.recorderSubjectId)?.displayName ?? "Recorder";
  const lines: string[] = [];
  lines.push(memo.topic);
  lines.push("=".repeat(memo.topic.length));
  lines.push("");
  lines.push(`Recorded by ${recorderName} on ${formatDate(memo.createdAt)}.`);
  lines.push("");
  for (const block of memo.transcript) {
    if (block.chapterTitle) {
      lines.push("");
      lines.push(`— ${block.chapterTitle} —`);
      lines.push("");
    }
    const speaker = block.speaker === "interviewer" ? "Q" : recorderName;
    lines.push(`${speaker}: ${block.text}`);
    lines.push("");
  }
  if (memo.pullQuotes.length > 0) {
    lines.push("");
    lines.push("Pull quotes");
    lines.push("-----------");
    for (const q of memo.pullQuotes) lines.push(`  "${q}"`);
  }
  return lines.join("\n");
}

function buildReadme(memo: Memo, family: Family): string {
  const recorderName = subjectFor(family, memo.recorderSubjectId)?.displayName ?? "Recorder";
  return [
    "Kin — a family voice archive",
    "",
    `Topic:      ${memo.topic}`,
    `Recorder:   ${recorderName}`,
    `Recorded:   ${formatDate(memo.createdAt)}`,
    `Duration:   ${Math.round(memo.durationSeconds / 60)} min`,
    `Categories: ${memo.categories.map((c) => c.label).join(", ") || "(none)"}`,
    "",
    "Files in this archive:",
    "  audio.*         — the recording itself, in the recorder's voice",
    "  transcript.txt  — verbatim transcript",
    "  memo.json       — structured metadata",
    "",
    "This memo is yours. Keep it somewhere safe.",
  ].join("\n");
}

function serializeMemo(memo: Memo, family: Family) {
  const recorder = subjectFor(family, memo.recorderSubjectId);
  return {
    id: memo.id,
    topic: memo.topic,
    createdAt: memo.createdAt,
    durationSeconds: memo.durationSeconds,
    recorder: recorder
      ? { id: recorder.id, name: recorder.displayName, fullName: recorder.fullName }
      : { id: memo.recorderSubjectId, name: "Unknown" },
    categories: memo.categories,
    pullQuotes: memo.pullQuotes,
    transcript: memo.transcript,
    aboutSubjectIds: memo.aboutSubjectIds,
  };
}

function slugifyTitle(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "memo"
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
