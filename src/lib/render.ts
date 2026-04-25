// INVARIANT: memo audio blobs are immutable after save. This module is the
// only writer of audioBlobKey alongside lib/storage.ts. Voice consent
// revocation does NOT re-render existing memos — past audio plays as-is.
// If you find yourself wanting to mutate a Memo's audio, write a new Memo.

"use client";

import { v4 as randomId } from "./uuid";
import type { CategoryTag, Memo, TranscriptBlock } from "./types";
import { putAudioBlob, saveMemo } from "./storage";
import { isDemoMemo, isDemoMode, buildDemoMemo } from "./demo";

export interface FinalizeMemoInput {
  memoId: string;
  familyId: string;
  recorderSubjectId: string;
  intendedRecipientSubjectIds: string[];
  audience: import("./types").AudienceRule;
  topic: string;
  recorderAudioBlob: Blob;
  // The recorder mic input is a single continuous webm blob — slicing it
  // into per-turn blobs is not playable because only the first chunk has
  // the init segment. Per-turn boundaries instead live on the transcript
  // (TranscriptBlock.startMs / endMs for `recorder` blocks), and the listen
  // page seeks within this single blob.
  transcript: TranscriptBlock[];
  rawTranscript: string;
  pullQuotes: string[];
  categories: CategoryTag[];
  aboutSubjectIds: string[];
  parentMemoId?: string;
  durationSeconds: number;
}

export async function finalizeMemo(input: FinalizeMemoInput): Promise<Memo> {
  if (isDemoMode() && isDemoMemo(input.memoId)) {
    const demo = buildDemoMemo();
    await saveMemo(input.familyId, demo);
    return demo;
  }

  // Single full-recording blob — the unbroken mic capture. The listen page
  // uses transcript per-turn timestamps to seek inside this blob. Interviewer
  // questions are spoken via browser TTS at playback time — nothing to render.
  const fullPlaybackKey = `full-${input.memoId}-${randomId()}`;
  await putAudioBlob(input.familyId, fullPlaybackKey, input.recorderAudioBlob);

  const memo: Memo = {
    id: input.memoId,
    recorderSubjectId: input.recorderSubjectId,
    intendedRecipientSubjectIds: input.intendedRecipientSubjectIds,
    audience: input.audience,
    topic: input.topic,
    audioBlobKey: fullPlaybackKey,
    durationSeconds: input.durationSeconds,
    createdAt: new Date().toISOString(),
    transcript: input.transcript,
    rawTranscript: input.rawTranscript,
    pullQuotes: input.pullQuotes,
    categories: input.categories,
    aboutSubjectIds: input.aboutSubjectIds,
    parentMemoId: input.parentMemoId,
    frozen: true,
  };

  await saveMemo(input.familyId, memo);
  return memo;
}
