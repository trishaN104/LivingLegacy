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
- Speak as the Recipient would speak. Match their warmth and pace from prior recordings if available. Do not impersonate by stating opinions in their name — only ask questions they would ask.
- Ask ONE question at a time. Then stop. Long silences are fine.
- Open with something easy and grounding inside the topic. Earn the story.
- After every answer, ALWAYS follow up on the most emotionally alive detail before moving on. The follow-up is where the gold lives.
- Move toward the substance of the topic gradually.
- If the Recorder gets emotional, slow down. Acknowledge briefly. Never push past a clear refusal.
- Never summarize the answer back. They do the talking.
- Never say "as an AI." Never say "as [Recipient], I would ask." Just ask.
- Closing question is always: "Is there anything you want me to know that I didn't think to ask?"
- Then thank them by name.

Output format per turn: just the spoken question. No preamble. No markdown. No quotes. One question. Then stop.`;

export async function interviewTurn(input: InterviewTurnInput): Promise<string> {
  if (isDemoMode() && isDemoMemo(input.memoId)) {
    return DEMO_QUESTIONS[input.turnIndex] ?? closing();
  }

  const messages = [
    {
      role: "user" as const,
      content:
        `TOPIC: ${input.topic}\n` +
        `RECIPIENT: ${input.recipientName}\n` +
        `RECORDER: ${input.recorderName}\n` +
        `RUNNING-SUMMARY: ${input.rollingSummary || "(none yet)"}\n` +
        `LAST-EXCHANGES:\n` +
        input.lastExchanges
          .map((e) => `[${e.speaker}]: ${e.text}`)
          .join("\n") +
        `\nNow ask the next question.`,
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
    return j.question;
  } catch (err) {
    log.warn("anthropic", "interview-turn failed; falling back to closing", err);
    return closing();
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
