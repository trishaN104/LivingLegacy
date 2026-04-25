"use client";

import Link from "next/link";
import type { Family, Memo } from "@/lib/types";
import { subjectFor } from "@/lib/types";

export function MemoCard({ memo, family }: { memo: Memo; family: Family }) {
  const recorder = subjectFor(family, memo.recorderSubjectId);
  return (
    <Link
      href={`/family/record/${memo.id}/listen`}
      className="block rounded-lg border border-divider/40 bg-surface p-lg transition-colors hover:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-foliage-deep"
    >
      <p className="type-metadata text-blush-deep">
        {recorder?.displayName ?? "Someone"} · {formatDate(memo.createdAt)} ·{" "}
        {Math.round(memo.durationSeconds / 60)} min
      </p>
      <h3 className="type-display-m mt-1 text-primary">{memo.topic}</h3>
      {memo.pullQuotes[0] && (
        <p className="type-pullquote mt-md text-secondary reading-width">
          {memo.pullQuotes[0]}
        </p>
      )}
      <div className="mt-md flex flex-wrap gap-2">
        {memo.categories.slice(0, 3).map((c) => (
          <span
            key={c.slug}
            className="type-metadata rounded-sm bg-surface-elevated px-2 py-1 text-tertiary"
          >
            {c.label}
          </span>
        ))}
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
