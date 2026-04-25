// Core entity types for Kin. See PLAN.md §3 for design rationale.
//
// Subject ≠ Member. A Subject is a person in the tree (alive or deceased).
// A Member is a Subject who has activated the app and can record memos.
// Cross-filing onto "Stories about Grandma" works against Subject regardless
// of living status.

export type AudienceRule =
  | { kind: "everyone" }
  | { kind: "include"; subjectIds: string[] }
  | { kind: "exclude"; subjectIds: string[] };

export type Subject = {
  id: string;
  fullName: string;
  displayName: string;
  relationshipLabel: string; // "Mom", "Grandpa", "Emma's husband"
  photoUrl?: string;
  status: "alive" | "deceased";
  birthYear?: number;
  deathYear?: number; // present iff deceased
  generation?: number; // 0 = ancestral, 1 = parents, 2 = children, etc.
  createdAt: string;
};

export type Member = {
  subjectId: string;
  voiceCloneId?: string; // ElevenLabs voice ID, present iff consent granted
  voiceConsentAt?: string;
  voiceRevokedAt?: string; // future memos use neutral narrator if set
  defaultAudience: AudienceRule;
  perRecipientAudience?: Record<string, AudienceRule>;
  voiceFirstMode: boolean; // "Read everything to me and let me speak"
  createdAt: string;
};

export type TreeEdge = {
  fromSubjectId: string;
  toSubjectId: string;
  kind: "parent" | "child" | "spouse" | "sibling" | "other";
  label?: string;
};

export type TranscriptBlock = {
  speaker: "interviewer" | "recorder";
  text: string;
  startMs: number;
  endMs: number;
  chapterTitle?: string; // first block of each chapter carries the title
};

export type CategoryTag = {
  slug: string; // "recipes", "stories-about-{subjectId}"
  label: string;
  source: "ai" | "user";
};

export type Memo = {
  id: string;
  recorderSubjectId: string;
  intendedRecipientSubjectIds: string[];
  audience: AudienceRule;
  topic: string;
  audioBlobKey: string; // IndexedDB key — final stitched recorder-voice blob
  questionAudioBlobKeys: string[]; // per-question rendered audio for playback
  // Per-turn slices of the recorder's mic input, so playback can play
  // question[i] → answer[i] → question[i+1] → answer[i+1]. Older memos
  // recorded before this field existed will fall through to playing the
  // single `audioBlobKey` blob continuously without interleaved questions.
  answerAudioBlobKeys?: string[];
  durationSeconds: number;
  createdAt: string;
  transcript: TranscriptBlock[];
  rawTranscript: string; // unedited Whisper output
  pullQuotes: string[];
  categories: CategoryTag[];
  aboutSubjectIds: string[]; // cross-filing
  voiceUsedForQuestions: string; // "kin-narrator" or recorderSubjectId
  parentMemoId?: string; // present iff this memo is a reply
  frozen: true; // type-level invariant: memos do not mutate after save
};

export type Family = {
  id: string; // family code "warm-river-cedar-stone-rose-amber"
  name: string;
  createdAt: string;
  subjects: Subject[];
  members: Member[];
  tree: TreeEdge[];
  defaultAudienceByRecorder: Record<string, AudienceRule>;
};

export class PrivacyViolationError extends Error {
  constructor(public memoId: string, public viewerId: string) {
    super(`viewer ${viewerId} not authorized for memo ${memoId}`);
    this.name = "PrivacyViolationError";
  }
}

// Convenience helpers used across the app.
export function memberFor(family: Family, subjectId: string): Member | undefined {
  return family.members.find((m) => m.subjectId === subjectId);
}

export function subjectFor(family: Family, subjectId: string): Subject | undefined {
  return family.subjects.find((s) => s.id === subjectId);
}
