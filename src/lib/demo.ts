// Demo mode (R5). PLAN §9.
//
// When KIN_DEMO_MODE is on AND the memo in question is the seeded demo memo,
// every external-call wrapper short-circuits to a pre-rendered output. The
// 4-minute scripted §13 demo runs with no network dependency.

import type { CategoryTag, Memo, TranscriptBlock } from "./types";
import { SEED_SUBJECT_IDS } from "./seed";

export const DEMO_MEMO_ID = "memo-ma-spaghetti-2026-04-25";

// Server- and client-readable. NEXT_PUBLIC_ prefix exposes to browser.
export function isDemoMode(): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env.NEXT_PUBLIC_KIN_DEMO_MODE ?? process.env.KIN_DEMO_MODE;
  return v === "true" || v === "1";
}

export function isDemoMemo(memoId: string): boolean {
  return memoId === DEMO_MEMO_ID;
}

// ─── the scripted demo memo ──────────────────────────────────────────────────

// Four interviewer turns. Question 3 is the "follow-up generated from a detail
// in the answer" — see SPEC §13 step 5 (the proof point).
export const DEMO_QUESTIONS: string[] = [
  "Where were you when you first learned to make this?",
  "What did the kitchen smell like? I want to picture it.",
  "You mentioned Nani's hands — what did they look like when she was rolling the dough?", // ← follow-up from "her hands"
  "If I make this for my own kids one day, what's the one thing I have to get right?",
];

// Verbatim transcript per SPEC §15 — the recorder's words are sacred.
export const DEMO_TRANSCRIPT: TranscriptBlock[] = [
  block("interviewer", DEMO_QUESTIONS[0],            0,    4_200),
  block("recorder",
    "Oh — I was eight, maybe nine. We were in Hyderabad, in Nani's kitchen. " +
    "She had this huge brass pot and the whole house would smell like garlic " +
    "for two days after.",
    4_500, 19_800, "The summer Nani taught me"),
  block("interviewer", DEMO_QUESTIONS[1],            20_400, 24_000),
  block("recorder",
    "Like — like garlic, and tomatoes that had been simmering since morning. " +
    "And there was always tea on the other burner. Cardamom, mostly. Nani " +
    "did everything at once. Her hands never stopped.",
    24_400, 39_900, "What the kitchen smelled like"),
  block("interviewer", DEMO_QUESTIONS[2],            40_500, 47_400),
  block("recorder",
    "They were small. Smaller than mine. And so steady. She'd flatten the " +
    "dough with the heel of her hand and then she'd press her fingertips " +
    "into it, like she was reading it. I never saw her measure anything.",
    47_800, 65_100, "Nani's hands"),
  block("interviewer", DEMO_QUESTIONS[3],            65_700, 72_300),
  block("recorder",
    "Don't rush the onions. That's the whole secret. Everyone wants to skip " +
    "to the sauce, but Nani would stand there for forty minutes, just stirring " +
    "the onions until they went almost black. She used to say — \"the patience " +
    "is the recipe.\" That's the part you have to get right.",
    72_700, 96_400, "What you have to get right"),
];

export const DEMO_PULLQUOTES: string[] = [
  "Her hands never stopped.",
  "She'd press her fingertips into the dough, like she was reading it.",
  "The patience is the recipe.",
];

export const DEMO_CATEGORIES: CategoryTag[] = [
  { slug: "recipes",                                          label: "Recipes",            source: "ai" },
  { slug: "childhood",                                        label: "Childhood",          source: "ai" },
  { slug: "places",                                           label: "Places",             source: "ai" },
  { slug: `stories-about-${SEED_SUBJECT_IDS.nani}`,          label: "Stories about Nani", source: "ai" },
];

// Audio asset paths under /public/seed/demo-memo/. Files are dropped in by
// the user in PRE.2; the codebase references them as static URLs.
export const DEMO_AUDIO = {
  // Recorder-side (Ma hears these in the neutral "Kin" narrator voice while she records)
  questionsNarrator: [
    "/seed/demo-memo/q1-narrator.mp3",
    "/seed/demo-memo/q2-narrator.mp3",
    "/seed/demo-memo/q3-narrator.mp3",
    "/seed/demo-memo/q4-narrator.mp3",
  ],
  // Recipient-side (Aanya hears these in Ma's cloned voice on playback)
  questionsInRecorderVoice: [
    "/seed/demo-memo/q1-ma-voice.mp3",
    "/seed/demo-memo/q2-ma-voice.mp3",
    "/seed/demo-memo/q3-ma-voice.mp3",
    "/seed/demo-memo/q4-ma-voice.mp3",
  ],
  // The full stitched playback file — questions in Ma's cloned voice + Ma's
  // recorded answers, edited together. This is what Aanya plays back.
  fullPlayback: "/seed/demo-memo/full-playback.mp3",
};

export function buildDemoMemo(): Memo {
  return {
    id: DEMO_MEMO_ID,
    recorderSubjectId: SEED_SUBJECT_IDS.ma,
    intendedRecipientSubjectIds: [SEED_SUBJECT_IDS.aanya],
    audience: { kind: "include", subjectIds: [SEED_SUBJECT_IDS.aanya, SEED_SUBJECT_IDS.rohan] },
    topic:
      "I want to tell Aanya the recipe for the spaghetti my mother used to make.",
    audioBlobKey: `demo:${DEMO_MEMO_ID}:full-playback`,
    questionAudioBlobKeys: DEMO_AUDIO.questionsInRecorderVoice.map(
      (_, i) => `demo:${DEMO_MEMO_ID}:q${i + 1}-ma-voice`,
    ),
    durationSeconds: 96,
    createdAt: "2026-04-25T11:30:00.000Z",
    transcript: DEMO_TRANSCRIPT,
    rawTranscript: DEMO_TRANSCRIPT.filter((b) => b.speaker === "recorder")
      .map((b) => b.text)
      .join(" "),
    pullQuotes: DEMO_PULLQUOTES,
    categories: DEMO_CATEGORIES,
    aboutSubjectIds: [SEED_SUBJECT_IDS.nani],
    voiceUsedForQuestions: SEED_SUBJECT_IDS.ma,
    frozen: true,
  };
}

// Demo memos cross-file onto Nani's profile under "Stories about Nani."
// Resolves the §13 step 9 cross-filing payload without runtime Sonnet calls.

function block(
  speaker: "interviewer" | "recorder",
  text: string,
  startMs: number,
  endMs: number,
  chapterTitle?: string,
): TranscriptBlock {
  return { speaker, text, startMs, endMs, chapterTitle };
}
