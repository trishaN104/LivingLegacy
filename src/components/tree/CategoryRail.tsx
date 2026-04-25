"use client";

import Link from "next/link";
import type { Memo } from "@/lib/types";

// Horizontal rail of categories with counts. Tap → category page.
// Lives at the bottom of the family-tree page (SPEC §10).
export function CategoryRail({ memos }: { memos: Memo[] }) {
  const counts = new Map<string, { slug: string; label: string; count: number }>();
  for (const m of memos) {
    for (const c of m.categories) {
      const existing = counts.get(c.slug);
      if (existing) existing.count++;
      else counts.set(c.slug, { slug: c.slug, label: c.label, count: 1 });
    }
  }
  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return null;

  return (
    <div className="mt-2xl border-t border-divider/50 pt-lg">
      <p className="type-metadata text-ink-tertiary text-center">In this archive</p>
      <div className="mt-md flex flex-wrap items-center justify-center gap-md">
        {sorted.map((c) => (
          <Link
            key={c.slug}
            href={`/family/category/${c.slug}`}
            className="rounded-full bg-surface-elevated px-md py-2 type-ui-sm text-tertiary transition-colors hover:bg-surface hover:text-accent"
          >
            {c.label} <span className="type-metadata text-ink-tertiary">{c.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
