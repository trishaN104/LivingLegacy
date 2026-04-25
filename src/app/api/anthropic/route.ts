// Server-side Anthropic proxy. Holds the API key off the client.
// Dispatches by body.kind: "interview-turn" | "organize-memo" | "classify-intent" | "summarize".

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const MODELS = {
  interviewer: "claude-opus-4-7",
  organizer: "claude-sonnet-4-6",
  intent: "claude-haiku-4-5",
  summarizer: "claude-haiku-4-5",
} as const;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Demo mode runs without it." },
      { status: 503 },
    );
  }

  const body = await req.json();
  const client = new Anthropic({ apiKey });

  try {
    switch (body.kind) {
      case "interview-turn": {
        const msg = await client.messages.create({
          model: MODELS.interviewer,
          max_tokens: 200,
          system: body.system,
          messages: body.messages,
        });
        const text = msg.content
          .filter((b) => b.type === "text")
          .map((b) => ("text" in b ? b.text : ""))
          .join(" ");
        return NextResponse.json({ question: text.trim() });
      }
      case "organize-memo": {
        const msg = await client.messages.create({
          model: MODELS.organizer,
          max_tokens: 2000,
          system:
            "You organize a transcribed family memo. Output ONLY a JSON object with " +
            "keys: chapters (array of {title, blocks: [{speaker, text}]}), pullQuotes " +
            "(array of 3-5 verbatim recorder sentences), categories (array of {slug, " +
            "label}), aboutSubjectIds (array of subject IDs). No commentary.",
          messages: [{ role: "user", content: body.userMessage }],
        });
        const text = msg.content
          .filter((b) => b.type === "text")
          .map((b) => ("text" in b ? b.text : ""))
          .join("");
        return NextResponse.json({ raw: text });
      }
      case "classify-intent": {
        const msg = await client.messages.create({
          model: MODELS.intent,
          max_tokens: 200,
          system:
            "You classify a short voice utterance into a Kin app intent. Output " +
            "ONLY a single JSON object with shape {kind: string, ...slots}. " +
            "Valid kinds: play-from, play-latest, stop, pause, repeat, go-back, " +
            "send-memo-to, audience-restrict, wrap-up, read-family, search, " +
            "what-on-profile, unknown.",
          messages: [
            {
              role: "user",
              content: `family members: ${body.memberNames.join(", ")}\nutterance: ${body.utterance}`,
            },
          ],
        });
        const text = msg.content
          .filter((b) => b.type === "text")
          .map((b) => ("text" in b ? b.text : ""))
          .join("");
        return NextResponse.json({ raw: text });
      }
      case "summarize": {
        const msg = await client.messages.create({
          model: MODELS.summarizer,
          max_tokens: 250,
          system:
            "Summarize the conversation so far in 150 tokens or less. Concrete and " +
            "specific — preserve names and emotional details.",
          messages: [{ role: "user", content: body.userMessage }],
        });
        const text = msg.content
          .filter((b) => b.type === "text")
          .map((b) => ("text" in b ? b.text : ""))
          .join(" ");
        return NextResponse.json({ summary: text.trim() });
      }
      default:
        return NextResponse.json({ error: `unknown kind: ${body.kind}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
