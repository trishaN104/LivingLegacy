// Server-side OpenAI Whisper proxy.

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { toFile } from "openai/uploads";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  const fd = await req.formData();
  const audio = fd.get("audio");
  const prompt = (fd.get("prompt") as string | null) ?? undefined;
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  try {
    const file = await toFile(audio, "memo.webm");
    const out = await client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      prompt,
    });
    return NextResponse.json({ text: out.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
