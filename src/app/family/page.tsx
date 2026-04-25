"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { CategoryRail } from "@/components/tree/CategoryRail";
import { listMemos } from "@/lib/storage";
import { DEMO_FAMILY_ID } from "@/lib/seed";
import type { Memo } from "@/lib/types";

export default function FamilyHomePage() {
  const { family, loading } = useFamily(DEMO_FAMILY_ID);
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
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1100px] px-md pb-2xl">
      <nav className="flex items-center justify-between px-md py-md type-metadata text-ink-tertiary">
        <Link href="/family/profiles" className="hover:text-foliage-deep">
          ← profiles
        </Link>
        {currentMember && (
          <span>
            you are <span className="text-foliage-deep">{currentMember.displayName}</span>
          </span>
        )}
        <Link
          href="/family/record"
          className="rounded-full bg-tertiary px-4 py-1.5 text-on-tertiary hover:bg-accent"
        >
          + new memo
        </Link>
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
      <h1 className="type-display-l text-foliage-deep">No family on this device.</h1>
      <p className="type-body mt-md text-secondary">
        Enter a family code to open one, or set up a new family.
      </p>
      <div className="mt-lg flex gap-md">
        <Link href="/" className="type-ui-md rounded-md bg-primary px-lg py-md text-on-primary">
          back to start
        </Link>
      </div>
    </main>
  );
}
