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

LANGUAGE: Standard, neutral American English ONLY. The Recipient does not speak Hindi, Telugu, Tamil, Spanish, Tagalog, or any other language and does not use ethnic terms of endearment. NEVER use words like "beta", "kanna", "kanmani", "putta", "ammu", "ji", "amma", "appa", "didi", "bhai", "mijo", "mija", "bubbeleh", "habibi", "love", "darling", "sweetheart", "honey", "dear", or any other endearment. Do not use Indian English, British English, or AAVE inflections. Do not insert non-English words. Address the Recorder by their first name only when needed; otherwise speak in plain "you". Keep the register warm but unaccented and culturally neutral.

Output format per turn: just the spoken question. No preamble. No markdown. No quotes. One question. Then stop.`;

// Deterministic local fallbacks. Used only when the Anthropic call itself
// throws (e.g. network down, missing key, model rejection). 24 unique
// prompts across angles — sensory, social, temporal, reflective. Filters
// against ALL prior interviewer questions in the session so we never
// repeat, then falls through to a session-stamped final to keep things
// moving forward even after we've exhausted the bank.
function localFallback(input: InterviewTurnInput): string {
  const topicShort = input.topic
    .replace(/^I want to (tell|share) [^,.]+? /i, "")
    .slice(0, 60);

  const askedNorm = new Set(
    input.lastExchanges
      .filter((e) => e.speaker === "interviewer")
      .map((e) => normalize(e.text)),
  );

  const bank = [
    // Sensory grounding
    `Where were you when this happened — paint me the room.`,
    `What did you notice first — a smell, a sound, a face?`,
    `What do you remember hearing in the background?`,
    `What did the air feel like that day?`,
    `What were your hands doing while this was going on?`,
    `What were you wearing, do you remember?`,
    // Social
    `Who else was there with you?`,
    `Was there anyone you wished was there but wasn't?`,
    `Who was the first person you told?`,
    `Whose face do you see when you think back to this?`,
    // Temporal
    `What did you do in the minute right after?`,
    `What happened the next morning?`,
    `If you could rewind to one second of it, which second?`,
    `When in your life does this story come back to you?`,
    // Reflective
    `What is the smallest detail about ${topicShort || "this"} that has stayed with you?`,
    `What part do you think most people would miss?`,
    `What surprised you about how it ended?`,
    `What did this teach you that you still carry?`,
    `What's the one line you'd want me to remember from this?`,
    `If this were a photograph, what's in the frame?`,
    // Specifics
    `What were you holding in your hands at that moment?`,
    `What was the weather doing?`,
    `What were the words exactly — do you remember what was said?`,
    `What were you thinking but didn't say out loud?`,
  ];

  for (const candidate of bank) {
    if (!askedNorm.has(normalize(candidate))) return candidate;
  }
  // Genuine last-resort closer that varies with turnIndex.
  return `Is there anything else you want to add about ${topicShort || "this"} — a moment, a person, a smell — before I move us on?`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
}

export async function interviewTurn(input: InterviewTurnInput): Promise<string> {
  if (isDemoMode() && isDemoMemo(input.memoId)) {
    return DEMO_QUESTIONS[input.turnIndex] ?? closing();
  }

  // Build a real conversational history. Claude follows turn-by-turn
  // adherence MUCH better when prior interviewer questions are framed as
  // assistant turns and recorder answers as user turns, instead of a
  // single flattened string the model has to parse. The opening user
  // turn carries the immutable scene context.
  const opening = {
    role: "user" as const,
    content:
      `SCENE\n` +
      `Topic from the Recorder: ${input.topic}\n` +
      `Recipient (you): ${input.recipientName}\n` +
      `Recorder (the person you're interviewing): ${input.recorderName}\n` +
      `Conversation summary so far: ${input.rollingSummary || "(none yet — this is the opening turn)"}\n\n` +
      `Ask your opening question now.`,
  };

  const messages: { role: "user" | "assistant"; content: string }[] = [opening];

  // Replay prior turns so Claude *sees* what it already asked. Each
  // interviewer line appears as its own assistant message, each recorder
  // answer as its own user message.
  for (const e of input.lastExchanges) {
    if (e.speaker === "interviewer") {
      messages.push({ role: "assistant", content: e.text });
    } else {
      messages.push({
        role: "user",
        content: e.text || "(no clear answer captured — assume they spoke for ~10s; ask a different angle)",
      });
    }
  }

  // Final nudge so the model knows it's our turn now and what's off-limits.
  if (input.lastExchanges.length > 0) {
    const askedList = input.lastExchanges
      .filter((e) => e.speaker === "interviewer")
      .map((e, i) => `${i + 1}. ${e.text}`)
      .join("\n");
    messages.push({
      role: "user",
      content:
        `Now ask the next question.\n\n` +
        `RULES:\n` +
        `- ONE sentence only.\n` +
        `- DO NOT repeat or paraphrase ANY of these previously-asked questions:\n${askedList}\n` +
        `- Build on the most concrete detail in the last answer.\n` +
        `- If the last answer was vague, pick a fresh sensory or temporal angle.`,
    });
  }

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
    if (!res.ok) {
      const detail = await safeReadError(res);
      log.warn(
        "anthropic",
        `interview-turn ${res.status} — using local fallback. detail=${detail}`,
      );
      return localFallback(input);
    }
    const j = (await res.json()) as { question: string };
    const q = (j.question || "").trim();
    if (!q) {
      log.warn("anthropic", "interview-turn empty body — using local fallback");
      return localFallback(input);
    }
    // Last-mile guard: if the model still echoed a prior question, swap
    // for a fallback so the user never hears the same line twice.
    const askedNorm = input.lastExchanges
      .filter((e) => e.speaker === "interviewer")
      .map((e) => e.text.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim());
    const qNorm = q.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
    if (askedNorm.some((a) => a === qNorm || (a.length > 12 && qNorm.includes(a.slice(0, 16))))) {
      log.warn("anthropic", "interview-turn returned a repeat — using local fallback");
      return localFallback(input);
    }
    return q;
  } catch (err) {
    log.warn("anthropic", "interview-turn threw; using local fallback", err);
    return localFallback(input);
  }
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return typeof j === "object" && j !== null
      ? JSON.stringify(j)
      : String(j);
  } catch {
    return res.statusText;
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
