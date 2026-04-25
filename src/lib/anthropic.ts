// Single Anthropic SDK access point. Components NEVER import @anthropic-ai/sdk
// directly. This file delegates to /api/anthropic so the API key stays server-side.

"use client";

import { isDemoMemo, isDemoMode, DEMO_QUESTIONS } from "./demo";
import { log } from "./log";

export interface InterviewTurnInput {
  memoId: string;
  topic: string;
  recipientName: string;
  recorderName: string;
  rollingSummary: string;
  lastExchanges: { speaker: "interviewer" | "recorder"; text: string }[];
  turnIndex: number;
}

const INTERVIEWER_SYSTEM_PROMPT = `You are conducting a recorded family memo. The person you are interviewing — the Recorder — wants to share something with another family member, the Recipient, who is far away. The Recipient is not in the room. You are standing in for them, asking the questions they would ask if they were here.

Behavior:
- Speak as the Recipient would speak. Match their warmth and pace. Do not impersonate by stating opinions in their name — only ask questions they would ask.
- Ask ONE question at a time. Then stop. Long silences are fine.
- Open with something easy and grounding inside the topic. Earn the story.
- After every answer, ALWAYS follow up on the most emotionally alive detail in what they JUST said before moving on. The follow-up is where the gold lives.
- ABSOLUTELY NEVER repeat or paraphrase a question you have already asked. Every turn must move the conversation forward. If the prior answer was thin, ask about a different angle (a smell, a sound, a person, a year, a hand gesture, what came after) — never re-ask.
- If you have no fresh transcript of the recorder's last answer, assume they shared something and zoom in: ask about a sensory detail, a person they likely mentioned, or what happened next. Avoid generic "tell me more about that."
- Move toward the substance of the topic gradually across turns.
- If the Recorder gets emotional, slow down. Acknowledge briefly. Never push past a clear refusal.
- Never summarize the answer back. They do the talking.
- Never say "as an AI." Never say "as [Recipient], I would ask." Just ask.
- Closing question is always: "Is there anything you want me to know that I didn't think to ask?" Use this only on the final turn.
- Then thank them by name.

Output format per turn: just the spoken question. No preamble. No markdown. No quotes. One question. Then stop.`;

// Deterministic local fallbacks that vary by turn index AND topic so the user
// never hears the same closing question twice. Used when the API is
// unreachable, returns 5xx, or the user never set up Anthropic.
function localFallback(input: InterviewTurnInput): string {
  const topicShort = input.topic.replace(/^I want to (tell|share) [^,.]+? /i, "").slice(0, 60);
  const lastInterviewerLines = input.lastExchanges
    .filter((e) => e.speaker === "interviewer")
    .map((e) => e.text.toLowerCase());
  const banks: string[][] = [
    [
      `Where were you when this happened — paint me the room.`,
      `Who else was there with you?`,
      `What were your hands doing while this was going on?`,
      `What did you notice first — a smell, a sound, a face?`,
    ],
    [
      `What do you remember hearing in the background?`,
      `What did the air feel like that day?`,
      `What were you wearing, do you remember?`,
      `Was there anyone you wished was there but wasn't?`,
    ],
    [
      `What is the smallest detail about ${topicShort || "this"} that has stayed with you?`,
      `What did you do in the minute right after?`,
      `If you could rewind to one second of it, which second?`,
      `Did you tell anyone about it that night?`,
    ],
    [
      `What surprised you about how it ended?`,
      `What part do you think most people would miss?`,
      `What happened the next morning?`,
      `What did this teach you that you still carry?`,
    ],
  ];
  const tier = banks[Math.min(input.turnIndex, banks.length - 1)];
  for (const candidate of tier) {
    if (!lastInterviewerLines.some((q) => q.includes(candidate.slice(0, 16).toLowerCase()))) {
      return candidate;
    }
  }
  return tier[input.turnIndex % tier.length];
}

export async function interviewTurn(input: InterviewTurnInput): Promise<string> {
  if (isDemoMode() && isDemoMemo(input.memoId)) {
    return DEMO_QUESTIONS[input.turnIndex] ?? closing();
  }

  const priorQuestions = input.lastExchanges
    .filter((e) => e.speaker === "interviewer")
    .map((e, i) => `Q${i + 1}: ${e.text}`)
    .join("\n");
  const priorAnswers = input.lastExchanges
    .filter((e) => e.speaker === "recorder")
    .map((e, i) => `A${i + 1}: ${e.text}`)
    .join("\n");

  const messages = [
    {
      role: "user" as const,
      content:
        `TOPIC: ${input.topic}\n` +
        `RECIPIENT (asks the questions): ${input.recipientName}\n` +
        `RECORDER (answers): ${input.recorderName}\n` +
        `TURN-INDEX (zero-based): ${input.turnIndex}\n` +
        `RUNNING-SUMMARY: ${input.rollingSummary || "(none yet)"}\n\n` +
        `PRIOR QUESTIONS YOU HAVE ALREADY ASKED — DO NOT REPEAT OR PARAPHRASE ANY OF THESE:\n` +
        (priorQuestions || "(none yet — this is the opening question)") +
        `\n\nPRIOR ANSWERS FROM ${input.recorderName} (live in-browser transcript, may be partial or imperfect):\n` +
        (priorAnswers || "(no transcript captured yet — assume they answered and ask a fresh angle)") +
        `\n\nNow ask the next question. One sentence. Move the conversation forward — do not re-ask anything above.`,
    },
  ];

  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "interview-turn",
        system: INTERVIEWER_SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`interview-turn ${res.status}`);
    const j = (await res.json()) as { question: string };
    const q = (j.question || "").trim();
    if (!q) return localFallback(input);
    return q;
  } catch (err) {
    log.warn("anthropic", "interview-turn failed; using local fallback", err);
    return localFallback(input);
  }
}

export interface OrganizeMemoOutput {
  chapters: { title: string; blocks: { speaker: "interviewer" | "recorder"; text: string }[] }[];
  pullQuotes: string[];
  categories: { slug: string; label: string }[];
  aboutSubjectIds: string[];
}

export async function organizeMemo(input: {
  memoId: string;
  topic: string;
  rawTranscript: string;
  knownSubjects: { id: string; name: string }[];
}): Promise<OrganizeMemoOutput | null> {
  if (isDemoMode() && isDemoMemo(input.memoId)) {
    // Demo path bypasses Sonnet entirely — see lib/demo.ts.
    return null;
  }
  const userMessage =
    `TOPIC: ${input.topic}\n` +
    `KNOWN_SUBJECTS: ${input.knownSubjects.map((s) => `${s.id}=${s.name}`).join(", ")}\n` +
    `TRANSCRIPT:\n${input.rawTranscript}`;
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "organize-memo", userMessage }),
    });
    if (!res.ok) throw new Error(`organize-memo ${res.status}`);
    const j = (await res.json()) as { raw: string };
    return parseStructured(j.raw) as OrganizeMemoOutput | null;
  } catch (err) {
    log.warn("anthropic", "organize-memo failed", err);
    return null;
  }
}

export async function classifyIntentLLM(
  utterance: string,
  memberNames: string[],
): Promise<unknown | null> {
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "classify-intent", utterance, memberNames }),
    });
    if (!res.ok) throw new Error(`classify-intent ${res.status}`);
    const j = (await res.json()) as { raw: string };
    return parseStructured(j.raw);
  } catch (err) {
    log.warn("anthropic", "classify-intent failed", err);
    return null;
  }
}

export async function summarizeRolling(
  prevSummary: string,
  newExchanges: { speaker: string; text: string }[],
): Promise<string> {
  const userMessage =
    `PREVIOUS SUMMARY:\n${prevSummary || "(none)"}\n\n` +
    `NEW EXCHANGES:\n` +
    newExchanges.map((e) => `[${e.speaker}]: ${e.text}`).join("\n");
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "summarize", userMessage }),
    });
    if (!res.ok) throw new Error(`summarize ${res.status}`);
    const j = (await res.json()) as { summary: string };
    return j.summary;
  } catch (err) {
    log.warn("anthropic", "summarize failed", err);
    return prevSummary;
  }
}

function closing() {
  return "Is there anything you want me to know that I didn't think to ask?";
}

function parseStructured(raw: string): unknown | null {
  // Sonnet/Haiku occasionally wrap output in ```json fences — strip them.
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    log.warn("anthropic", "structured parse failed", raw.slice(0, 120));
    return null;
  }
}
