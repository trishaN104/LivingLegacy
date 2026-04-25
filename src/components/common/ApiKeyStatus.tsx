"use client";

import { useEffect, useState } from "react";

type Status = {
  anthropic: boolean;
  openai: boolean;
  demoMode: boolean;
};

// Renders a small accordion that reports which provider keys are configured
// and shows the user how to add the missing ones. Drives the answer to
// "how do I add my API keys?"
export function ApiKeyStatus({
  collapsedByDefault = true,
}: {
  collapsedByDefault?: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(!collapsedByDefault);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/keys", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as Status;
        if (!cancelled) setStatus(j);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const allSet = status.anthropic && status.openai;
  const summary = allSet
    ? "Both provider keys are configured."
    : status.demoMode
      ? "Demo mode is on — keys aren't required for the seeded demo memo."
      : "Some provider keys are missing.";

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-divider/50 bg-surface px-md py-md"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-md">
        <span className="type-metadata text-ink-tertiary">
          API keys · {summary}
        </span>
        <span className="type-metadata text-tertiary">{open ? "hide" : "show"}</span>
      </summary>

      <ul className="mt-md flex flex-col gap-2">
        <Row
          label="ANTHROPIC_API_KEY"
          on={status.anthropic}
          purpose="Opus interviewer · Sonnet organizer · Haiku intent fallback"
        />
        <Row
          label="OPENAI_API_KEY"
          on={status.openai}
          purpose="Whisper speech-to-text"
        />
      </ul>

      <div className="mt-md rounded-md bg-surface-elevated p-md">
        <p className="type-ui-sm text-primary">
          Add or update keys in <code>.env.local</code> at the project root,
          then restart the dev server (<code>npm run dev</code>).
        </p>
        <pre className="mt-2 overflow-x-auto rounded-sm bg-neutral p-3 text-[12px] leading-relaxed text-primary">
{`# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Demo mode short-circuits providers for the seeded memo.
# Turn it off when you want to record a brand-new memo with live providers.
KIN_DEMO_MODE=true
NEXT_PUBLIC_KIN_DEMO_MODE=true`}
        </pre>
        <p className="mt-2 type-metadata text-ink-tertiary">
          The keys are read server-side only. They are never sent to the
          browser; this panel only tells you whether each one is set.
        </p>
      </div>
    </details>
  );
}

function Row({
  label,
  on,
  purpose,
}: {
  label: string;
  on: boolean;
  purpose: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-md">
      <span className="type-ui-sm text-primary">
        <code>{label}</code>{" "}
        <span className="text-ink-tertiary">— {purpose}</span>
      </span>
      <span
        className={`type-metadata ${on ? "text-foliage-deep" : "text-blush-deep"}`}
      >
        {on ? "configured" : "not set"}
      </span>
    </li>
  );
}
