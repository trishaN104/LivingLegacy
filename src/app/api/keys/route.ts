// Safe read-only status of which API keys are configured. Returns
// boolean flags only — never the key values themselves. The client uses
// this to render the "API key status" panel.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    demoMode:
      process.env.KIN_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_KIN_DEMO_MODE === "true",
  });
}
