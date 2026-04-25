"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { CategoryRail } from "@/components/tree/CategoryRail";
import { listMemos } from "@/lib/storage";
import type { Memo } from "@/lib/types";

export default function FamilyHomePage() {
  const { family, loading } = useFamily();
  const { currentSubjectId } = useProfile();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    if (!family) return;
    void listMemos(family.id).then(setMemos);
  }, [family]);

  if (loading) return <LoadingState />;
  if (!family) return <NoFamily />;

  const currentMember =
    currentSubjectId && family.subjects.find((s) => s.id === currentSubjectId);

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1280px] px-md pb-2xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-divider/60 py-md type-metadata text-ink-tertiary">
        <Link href="/family/profiles" className="hover:text-foliage-deep">
          ← profiles
        </Link>
        {currentMember ? (
          <span className="hidden sm:inline">
            You are <span className="text-foliage-deep">{currentMember.displayName}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-3">
          <Link
            href="/family/add-member"
            className="inline-flex min-h-[40px] items-center rounded-full border border-primary/30 px-lg py-1.5 text-primary transition-colors hover:bg-surface-elevated"
          >
            + add member
          </Link>
          <Link
            href="/family/record"
            className="inline-flex min-h-[40px] items-center rounded-full bg-tertiary px-lg py-1.5 text-on-tertiary transition-colors hover:bg-accent"
          >
            + new memo
          </Link>
        </span>
      </nav>

      <FamilyTree
        family={family}
        memos={memos}
        currentSubjectId={currentSubjectId}
      />

      <CategoryRail memos={memos} />
    </main>
  );
}

function LoadingState() {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center">
      <p className="type-metadata text-ink-tertiary">loading the family…</p>
    </main>
  );
}

function NoFamily() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-lg text-center">
      <p className="type-metadata text-blush-deep">An empty volume</p>
      <h1 className="type-display-l mt-sm text-foliage-deep">No family on this device.</h1>
      <p className="type-body mt-md text-secondary">
        Enter a family code to open one, or set up a new family.
      </p>
      <div className="mt-lg flex gap-md">
        <Link href="/" className="inline-flex min-h-[56px] items-center rounded-md bg-primary px-lg py-md type-ui-md text-on-primary">
          Back to the cover
        </Link>
      </div>
    </main>
  );
}
