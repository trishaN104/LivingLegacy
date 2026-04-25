"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { TreePortraitOval } from "@/components/tree/TreePortraitOval";
import { MemoCard } from "@/components/profile/MemoCard";
import { listMemos } from "@/lib/storage";
import { memosVisibleTo } from "@/lib/privacy";
import { subjectFor } from "@/lib/types";
import type { Memo } from "@/lib/types";

type Tab = "memos" | "about" | "tree";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const { family, loading } = useFamily();
  const { currentSubjectId } = useProfile();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [tab, setTab] = useState<Tab>("memos");

  useEffect(() => {
    if (!family) return;
    void listMemos(family.id).then(setMemos);
  }, [family]);

  const visibleMemos = useMemo(() => {
    if (!family || !currentSubjectId) return [];
    const viewer = subjectFor(family, currentSubjectId);
    if (!viewer) return [];
    return memosVisibleTo(viewer, family, memos);
  }, [family, currentSubjectId, memos]);

  if (loading || !family) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading…</p>
      </main>
    );
  }

  const subject = subjectFor(family, memberId);
  if (!subject) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">no such member</p>
      </main>
    );
  }

  const memosByThem = visibleMemos.filter((m) => m.recorderSubjectId === subject.id);
  const memosAboutThem = visibleMemos.filter(
    (m) => m.aboutSubjectIds.includes(subject.id) && m.recorderSubjectId !== subject.id,
  );

  const dateline =
    subject.birthYear && subject.deathYear
      ? `${subject.birthYear} — ${subject.deathYear}`
      : subject.birthYear
        ? `${subject.birthYear} —`
        : "";

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1280px] px-md pb-2xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-divider/60 py-md type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">← family tree</Link>
        <span className="hidden sm:inline">A profile</span>
        <Link href="/family/record" className="hover:text-foliage-deep">+ new memo</Link>
      </nav>

      <article className="rise mt-xl grid gap-2xl lg:mt-2xl lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-3xl" style={{ animationDelay: "120ms" }}>
        <aside className="lg:sticky lg:top-md lg:self-start">
          <div className="rounded-2xl border border-divider/40 bg-surface px-lg py-xl shadow-[0_24px_60px_-30px_rgba(31,27,22,0.18)] sm:px-xl sm:py-2xl">
            <p className="type-metadata text-blush-deep">
              {subject.relationshipLabel}
              {subject.status === "deceased" && " · in memory"}
            </p>
            <h1 className="type-display-l mt-sm text-foliage-deep">
              {subject.displayName}
            </h1>
            {subject.fullName && subject.fullName !== subject.displayName && (
              <p className="mt-1 type-body italic text-secondary">{subject.fullName}</p>
            )}
            {dateline && (
              <p className="mt-sm type-metadata text-ink-tertiary">{dateline}</p>
            )}

            <div className="editorial-rule my-lg" />

            <div className="flex justify-center">
              <TreePortraitOval
                src={subject.photoUrl}
                alt={subject.displayName}
                memorial={subject.status === "deceased"}
                size="md"
              />
            </div>

            <div className="editorial-rule my-lg" />

            <Link
              href="/family"
              className="type-metadata block text-center text-tertiary underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              ← back to the family tree
            </Link>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap gap-md border-b border-divider/50">
            {(["memos", "about", "tree"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`type-ui-md min-h-[44px] px-md py-2 transition-colors ${
                  tab === t
                    ? "border-b-2 border-foliage-deep text-foliage-deep"
                    : "text-ink-tertiary hover:text-primary"
                }`}
                type="button"
              >
                {label(t, memosByThem, memosAboutThem)}
              </button>
            ))}
          </div>

          <div className="mt-xl">
            {tab === "memos" && (
              <Stack>
                {memosByThem.length === 0 && (
                  <p className="type-body text-ink-tertiary reading-width">
                    {subject.displayName} hasn&apos;t recorded a memo yet.
                  </p>
                )}
                {memosByThem.map((m) => (
                  <MemoCard key={m.id} memo={m} family={family} />
                ))}
              </Stack>
            )}
            {tab === "about" && (
              <Stack>
                {memosAboutThem.length === 0 && (
                  <p className="type-body text-ink-tertiary reading-width">
                    Nothing has been recorded about {subject.displayName} yet.
                  </p>
                )}
                {memosAboutThem.map((m) => (
                  <MemoCard key={m.id} memo={m} family={family} />
                ))}
              </Stack>
            )}
            {tab === "tree" && (
              <p className="type-body text-secondary">
                <Link href="/family" className="text-tertiary underline-offset-4 hover:underline">
                  See {subject.displayName}&apos;s place in the family →
                </Link>
              </p>
            )}
          </div>
        </section>
      </article>
    </main>
  );
}

function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-md">{children}</div>;
}

function label(t: Tab, by: Memo[], about: Memo[]): string {
  switch (t) {
    case "memos":
      return `Memos (${by.length})`;
    case "about":
      return `About them (${about.length})`;
    case "tree":
      return "Tree";
  }
}
