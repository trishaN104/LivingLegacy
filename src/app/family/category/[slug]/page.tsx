"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { listMemos } from "@/lib/storage";
import { memosVisibleTo } from "@/lib/privacy";
import { subjectFor, type Memo } from "@/lib/types";
import { MemoCard } from "@/components/profile/MemoCard";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { family, loading } = useFamily();
  const { currentSubjectId } = useProfile();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    if (!family) return;
    void listMemos(family.id).then(setMemos);
  }, [family]);

  if (loading || !family) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading…</p>
      </main>
    );
  }

  const viewer = currentSubjectId ? subjectFor(family, currentSubjectId) : null;
  const visible = viewer ? memosVisibleTo(viewer, family, memos) : [];
  const filtered = visible.filter((m) => m.categories.some((c) => c.slug === slug));
  const label =
    filtered[0]?.categories.find((c) => c.slug === slug)?.label ?? humanize(slug);

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-md py-2xl">
      <nav className="flex items-center justify-between type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">← family tree</Link>
      </nav>
      <header className="mt-md text-center">
        <p className="type-metadata text-blush-deep">A category in {family.name}</p>
        <h1 className="type-display-l mt-2 text-foliage-deep">{label}</h1>
        <p className="type-metadata mt-1 text-ink-tertiary">{filtered.length} memos</p>
      </header>
      <section className="mt-2xl flex flex-col gap-md">
        {filtered.map((m) => (
          <MemoCard key={m.id} memo={m} family={family} />
        ))}
        {filtered.length === 0 && (
          <p className="type-body text-center text-secondary">
            Nothing in this category yet.
          </p>
        )}
      </section>
    </main>
  );
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
