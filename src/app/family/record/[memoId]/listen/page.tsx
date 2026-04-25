"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { getMemo } from "@/lib/storage";
import { canMemberPlayMemo } from "@/lib/privacy";
import { PlayButtonLarge } from "@/components/memo/PlayButtonLarge";
import { VerbatimTranscript } from "@/components/memo/VerbatimTranscript";
import { VerbatimPullquote } from "@/components/memo/VerbatimPullquote";
import { DownloadMemoButton } from "@/components/memo/DownloadMemoButton";
import { subjectFor, type Memo } from "@/lib/types";
import { DEMO_FAMILY_ID } from "@/lib/seed";

export default function ListenPage({
  params,
}: {
  params: Promise<{ memoId: string }>;
}) {
  const { memoId } = use(params);
  const { family, loading } = useFamily(DEMO_FAMILY_ID);
  const { currentSubjectId } = useProfile();
  const [memo, setMemo] = useState<Memo | null>(null);

  useEffect(() => {
    if (!family) return;
    void getMemo(family.id, memoId).then(setMemo);
  }, [family, memoId]);

  if (loading || !family) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading…</p>
      </main>
    );
  }
  if (!memo) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">memo not found</p>
      </main>
    );
  }

  const viewer = currentSubjectId ? subjectFor(family, currentSubjectId) : undefined;
  const recorder = subjectFor(family, memo.recorderSubjectId);
  const canPlay = viewer ? canMemberPlayMemo(viewer, memo, family) : false;

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-md py-2xl">
      <nav className="flex items-center justify-between type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">
          ← family tree
        </Link>
        {recorder && (
          <span>
            from <span className="text-foliage-deep">{recorder.displayName}</span>
            {memo.voiceUsedForQuestions !== "kin-narrator" && (
              <span className="ml-2 text-blush-deep">
                · in {recorder.displayName}'s voice
              </span>
            )}
          </span>
        )}
      </nav>

      <header className="mt-lg">
        <p className="type-metadata text-blush-deep">
          {recorder?.displayName ?? "Someone"} · {formatDate(memo.createdAt)} ·{" "}
          {Math.round(memo.durationSeconds / 60)} min
        </p>
        <h1 className="type-display-l mt-2 text-foliage-deep">{memo.topic}</h1>
        <div className="mt-md flex flex-wrap gap-2">
          {memo.categories.map((c) => (
            <span
              key={c.slug}
              className="type-metadata rounded-sm bg-surface-elevated px-2 py-1 text-tertiary"
            >
              {c.label}
            </span>
          ))}
        </div>
      </header>

      <section className="mt-xl flex flex-col items-center gap-md rounded-lg bg-surface px-lg py-xl">
        {canPlay && viewer ? (
          <PlayButtonLarge memo={memo} family={family} viewer={viewer} />
        ) : (
          <p className="type-metadata text-ink-tertiary">
            This memo is not for you to listen to.
          </p>
        )}
        <p className="type-metadata text-ink-tertiary text-center">
          {memo.voiceUsedForQuestions === "kin-narrator"
            ? "Questions in a stand-in voice. The recorder hasn't recorded a voice sample yet."
            : "Questions and answers in the recorder's voice."}
        </p>
      </section>

      {memo.pullQuotes.length > 0 && (
        <section className="mt-2xl flex flex-col gap-lg">
          {memo.pullQuotes.map((q, i) => (
            <VerbatimPullquote key={i} text={q} />
          ))}
        </section>
      )}

      <section className="mt-2xl">
        <VerbatimTranscript blocks={memo.transcript} />
      </section>

      <section className="mt-2xl flex flex-wrap gap-md border-t border-divider/50 pt-lg">
        <Link
          href={`/family/record?reply=${encodeURIComponent(memo.id)}`}
          className="rounded-full bg-tertiary px-lg py-md type-ui-md text-on-tertiary hover:bg-accent"
        >
          Reply
        </Link>
        {canPlay && viewer && (
          <DownloadMemoButton memo={memo} family={family} viewer={viewer} />
        )}
      </section>
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
