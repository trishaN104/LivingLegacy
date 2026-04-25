// INVARIANT: memo audio blobs are immutable after save. This module is the
// only writer of audioBlobKey alongside lib/storage.ts. Voice consent
// revocation does NOT re-render existing memos — past audio plays as-is.
// If you find yourself wanting to mutate a Memo's audio, write a new Memo.

"use client";

import { v4 as randomId } from "./uuid";
import type { CategoryTag, Memo, TranscriptBlock } from "./types";
import { putAudioBlob, saveMemo } from "./storage";
import { renderQuestion } from "./elevenlabs";
import { isDemoMemo, isDemoMode, buildDemoMemo } from "./demo";
import { log } from "./log";

export interface FinalizeMemoInput {
  memoId: string;
  familyId: string;
  recorderSubjectId: string;
  recorderVoiceCloneId: string | null;
  intendedRecipientSubjectIds: string[];
  audience: import("./types").AudienceRule;
  topic: string;
  recorderAudioBlob: Blob;
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

  const interviewerTurns = input.transcript.filter((b) => b.speaker === "interviewer");
  const questionAudioBlobKeys: string[] = [];
  const voiceUsedForQuestions = input.recorderVoiceCloneId ?? "kin-narrator";

  for (let i = 0; i < interviewerTurns.length; i++) {
    const turn = interviewerTurns[i];
    try {
      const blob = await renderQuestion({
        memoId: input.memoId,
        questionIndex: i,
        voiceCloneId: input.recorderVoiceCloneId,
        text: turn.text,
      });
      const key = `q-${input.memoId}-${i}-${randomId()}`;
      await putAudioBlob(input.familyId, key, blob);
      questionAudioBlobKeys.push(key);
    } catch (err) {
      log.warn("render", `question ${i} render failed; continuing`, err);
    }
  }

  // For now, the "stitched" playback blob is the recorder's raw audio. Phase
  // I.4 stitches per-question rendered audio in front of each answer using
  // transcript timing — out of scope for the core demo path which uses the
  // pre-rendered demo blob.
  const fullPlaybackKey = `full-${input.memoId}-${randomId()}`;
  await putAudioBlob(input.familyId, fullPlaybackKey, input.recorderAudioBlob);

  const memo: Memo = {
    id: input.memoId,
    recorderSubjectId: input.recorderSubjectId,
    intendedRecipientSubjectIds: input.intendedRecipientSubjectIds,
    audience: input.audience,
    topic: input.topic,
    audioBlobKey: fullPlaybackKey,
    questionAudioBlobKeys,
    durationSeconds: input.durationSeconds,
    createdAt: new Date().toISOString(),
    transcript: input.transcript,
    rawTranscript: input.rawTranscript,
    pullQuotes: input.pullQuotes,
    categories: input.categories,
    aboutSubjectIds: input.aboutSubjectIds,
    voiceUsedForQuestions,
    parentMemoId: input.parentMemoId,
    frozen: true,
  };

  await saveMemo(input.familyId, memo);
  return memo;
}
