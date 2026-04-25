// PRIVACY GATE — single source of truth.
//
// SPEC §12 / PLAN §4: every code path that touches memo audio MUST go through
// `playMemo()`. Direct reads of `memo.audioBlobKey` outside this file (and
// `lib/render.ts`, the only writer) are a bug.
//
// Audience rule evaluation is the load-bearing privacy decision. The recorder
// always passes their own gate; for everyone else, `audience` decides.

import type { AudienceRule, Family, Memo, Subject } from "./types";
import { PrivacyViolationError } from "./types";

export function evaluateAudience(rule: AudienceRule, viewerId: string): boolean {
  switch (rule.kind) {
    case "everyone":
      return true;
    case "include":
      return rule.subjectIds.includes(viewerId);
    case "exclude":
      return !rule.subjectIds.includes(viewerId);
  }
}

export function canMemberPlayMemo(
  viewer: Subject,
  memo: Memo,
  // family kept on the signature so future rules (e.g. memorial state, gated
  // categories) can consult the broader graph without changing call sites.
  _family: Family,
): boolean {
  if (viewer.id === memo.recorderSubjectId) return true; // owner always passes
  return evaluateAudience(memo.audience, viewer.id);
}

export function memosVisibleTo(
  viewer: Subject,
  family: Family,
  memos: Memo[],
): Memo[] {
  return memos.filter((m) => canMemberPlayMemo(viewer, m, family));
}

export function canSubjectEditMemoAudience(viewer: Subject, memo: Memo): boolean {
  return viewer.id === memo.recorderSubjectId;
}

// THE ONLY function in the codebase that returns memo audio. Components must
// call this — they must never read `memo.audioBlobKey` directly.
//
// `loadAudioBlob` is injected so this module stays storage-agnostic and
// trivially testable.
export async function playMemo(
  viewer: Subject,
  memo: Memo,
  family: Family,
  loadAudioBlob: (key: string) => Promise<Blob>,
): Promise<Blob> {
  if (!canMemberPlayMemo(viewer, memo, family)) {
    throw new PrivacyViolationError(memo.id, viewer.id);
  }
  return loadAudioBlob(memo.audioBlobKey);
}
