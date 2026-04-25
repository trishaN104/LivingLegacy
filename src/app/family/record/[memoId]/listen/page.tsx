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
import { TreePortraitOval } from "@/components/tree/TreePortraitOval";
import { subjectFor, type Memo } from "@/lib/types";

export default function ListenPage({
  params,
}: {
  params: Promise<{ memoId: string }>;
}) {
  const { memoId } = use(params);
  const { family, loading } = useFamily();
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
  const folio = String(memo.id.replace(/[^0-9]/g, "").slice(-3) || "01").padStart(2, "0");

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1280px] px-md pb-2xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-divider/60 py-md type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">
          ← family tree
        </Link>
        {recorder && (
          <span className="hidden sm:inline">
            from <span className="text-foliage-deep">{recorder.displayName}</span>
            {memo.voiceUsedForQuestions !== "kin-narrator" && (
              <span className="ml-2 text-blush-deep">
                · in {recorder.displayName}'s voice
              </span>
            )}
          </span>
        )}
        <Link
          href={`/family/record?reply=${encodeURIComponent(memo.id)}`}
          className="inline-flex min-h-[40px] items-center rounded-full bg-tertiary px-lg py-1.5 text-on-tertiary transition-colors hover:bg-accent"
        >
          ↩ Reply
        </Link>
      </nav>

      <article
        className="rise mt-xl grid gap-2xl lg:mt-2xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-3xl"
        style={{ animationDelay: "120ms" }}
      >
        <Bookplate
          memo={memo}
          recorderName={recorder?.displayName ?? "Someone"}
          recorderPhoto={recorder?.photoUrl}
          deceased={recorder?.status === "deceased"}
          folio={folio}
          canPlay={canPlay}
          family={family}
          viewer={viewer ?? null}
        />

        <main className="relative">
          <header>
            <p className="type-metadata text-blush-deep">
              {recorder?.displayName ?? "Someone"} · {formatDate(memo.createdAt)} ·{" "}
              {Math.max(1, Math.round(memo.durationSeconds / 60))} min
            </p>
            <h1 className="type-display-l mt-md text-foliage-deep">
              {prettyTopic(memo.topic)}
            </h1>
            {memo.categories.length > 0 && (
              <div className="mt-md flex flex-wrap gap-sm">
                {memo.categories.map((c) => (
                  <span
                    key={c.slug}
                    className="type-metadata rounded-full border border-divider/60 bg-surface-elevated px-3 py-1 text-tertiary"
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="editorial-rule mt-xl" />

          {memo.pullQuotes.length > 0 && (
            <section className="mt-xl flex flex-col gap-lg">
              {memo.pullQuotes.map((q, i) => (
                <VerbatimPullquote key={i} text={q} />
              ))}
            </section>
          )}

          <section className="mt-2xl">
            <p className="type-metadata text-blush-deep">In their own words</p>
            <div className="mt-md">
              <VerbatimTranscript blocks={memo.transcript} />
            </div>
          </section>

          {canPlay && viewer && (
            <section className="mt-2xl flex flex-wrap items-center gap-md border-t border-divider/50 pt-lg">
              <DownloadMemoButton memo={memo} family={family} viewer={viewer} />
              <p className="type-metadata text-ink-tertiary">
                A keepsake of this memo, in a folder you control.
              </p>
            </section>
          )}
        </main>
      </article>
    </main>
  );
}

function Bookplate({
  memo,
  recorderName,
  recorderPhoto,
  deceased,
  folio,
  canPlay,
  family,
  viewer,
}: {
  memo: Memo;
  recorderName: string;
  recorderPhoto?: string;
  deceased: boolean;
  folio: string;
  canPlay: boolean;
  family: import("@/lib/types").Family;
  viewer: import("@/lib/types").Subject | null;
}) {
  return (
    <aside className="lg:sticky lg:top-md lg:self-start">
      <div className="relative overflow-hidden rounded-2xl border border-divider/40 bg-surface px-lg py-xl shadow-[0_24px_60px_-30px_rgba(31,27,22,0.18)] sm:px-xl sm:py-2xl">
        <span
          aria-hidden
          className="type-folio absolute -right-2 -top-4 select-none text-foliage-deep/10"
        >
          {folio}
        </span>

        <p className="type-metadata text-blush-deep">A memo</p>
        <p className="type-display-m mt-sm italic text-foliage-deep">
          {recorderName}
        </p>

        <div className="mt-lg flex justify-center">
          <TreePortraitOval
            src={recorderPhoto}
            alt={recorderName}
            memorial={deceased}
            size="md"
          />
        </div>

        <div className="editorial-rule mt-xl" />

        <div className="mt-lg flex flex-col items-center gap-md">
          {canPlay && viewer ? (
            <PlayButtonLarge memo={memo} family={family} viewer={viewer} />
          ) : (
            <p className="type-body text-center text-ink-tertiary">
              This memo is not for you to listen to.
            </p>
          )}
          <p className="type-metadata text-center text-ink-tertiary">
            {memo.voiceUsedForQuestions === "kin-narrator"
              ? "Stand-in narrator voice"
              : "Recorded in their own voice"}
          </p>
        </div>
      </div>
    </aside>
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

// "I want to tell Aanya the recipe for the spaghetti…" → "The recipe for the
// spaghetti…". Keeps the editorial title clean while preserving the original
// utterance below if needed elsewhere.
function prettyTopic(topic: string): string {
  const m = topic.match(/^I want to (?:tell|share) [^,.]+? (.+)$/i);
  if (!m) return topic;
  const rest = m[1].trim();
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
