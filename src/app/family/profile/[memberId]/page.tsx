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

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-md py-2xl">
      <nav className="flex items-center justify-between type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">← family tree</Link>
      </nav>

      <header className="mt-md flex flex-col items-center gap-md text-center sm:flex-row sm:items-end sm:text-left">
        <TreePortraitOval
          src={subject.photoUrl}
          alt={subject.displayName}
          memorial={subject.status === "deceased"}
          size="md"
        />
        <div>
          <p className="type-metadata text-blush-deep">
            {subject.relationshipLabel}
            {subject.status === "deceased" && " · in memory"}
          </p>
          <h1 className="type-display-xl mt-1 text-foliage-deep">{subject.displayName}</h1>
          <p className="type-metadata text-ink-tertiary">
            {subject.fullName}
            {subject.birthYear &&
              ` · ${subject.birthYear}${
                subject.deathYear ? ` – ${subject.deathYear}` : " –"
              }`}
          </p>
        </div>
      </header>

      <div className="mt-xl flex gap-md border-b border-divider/50">
        {(["memos", "about", "tree"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`type-ui-md py-2 transition-colors ${
              tab === t
                ? "border-b-2 border-foliage-deep text-foliage-deep"
                : "text-ink-tertiary hover:text-primary"
            }`}
            type="button"
          >
            {tab === t ? <strong>{label(t, memosByThem, memosAboutThem)}</strong> : label(t, memosByThem, memosAboutThem)}
          </button>
        ))}
      </div>

      <section className="mt-lg">
        {tab === "memos" && (
          <Stack>
            {memosByThem.length === 0 && (
              <p className="type-metadata text-ink-tertiary">
                {subject.displayName} hasn't recorded a memo yet.
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
              <p className="type-metadata text-ink-tertiary">
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
              See {subject.displayName}'s place in the family →
            </Link>
          </p>
        )}
      </section>
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
