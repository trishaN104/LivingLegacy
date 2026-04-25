"use client";

import Link from "next/link";
import type { Subject } from "@/lib/types";
import { TreePortraitOval } from "./TreePortraitOval";

interface Props {
  subject: Subject;
  variant?: "default" | "ancestral" | "memorial";
  hasNewMemo?: boolean;
  onClick?: () => void;
  hrefBase?: string; // e.g. "/family/profile" → /family/profile/[id]
}

// Default: sage plate. Ancestral (top generation): blush plate. Memorial: sage
// plate with name in {colors.ink-tertiary}. See DESIGN.md "Components".
export function TreeNode({
  subject,
  variant = "default",
  hasNewMemo,
  onClick,
  hrefBase,
}: Props) {
  const plateClass =
    variant === "ancestral"
      ? "bg-blush-plate"
      : "bg-sage-plate";
  const nameClass =
    variant === "memorial" ? "text-ink-tertiary" : "text-foliage-deep";

  const inner = (
    <div className="flex w-[140px] flex-col items-center text-center crossfade">
      <div className="relative">
        <TreePortraitOval
          src={subject.photoUrl}
          alt={subject.displayName}
          memorial={variant === "memorial" || subject.status === "deceased"}
        />
        {hasNewMemo && (
          <span
            aria-label="New memo waiting"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-tertiary text-[10px] font-semibold text-on-tertiary"
          >
            ●
          </span>
        )}
      </div>
      <div
        className={`mt-2 rounded-md px-3 py-1.5 ${plateClass} shadow-[0_1px_0_rgba(0,0,0,0.04)]`}
        style={{ minWidth: 110 }}
      >
        <div className={`type-tree-name ${nameClass}`}>{subject.displayName}</div>
        <div className={`type-tree-dates mt-0.5 ${nameClass}`} style={{ opacity: 0.85 }}>
          {formatDates(subject)}
        </div>
      </div>
    </div>
  );

  if (hrefBase) {
    return (
      <Link
        href={`${hrefBase}/${subject.id}`}
        className="cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foliage-deep"
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foliage-deep"
      >
        {inner}
      </button>
    );
  }
  return inner;
}

function formatDates(s: Subject): string {
  if (s.status === "deceased" && s.birthYear && s.deathYear) {
    return `${s.birthYear} – ${s.deathYear}`;
  }
  if (s.birthYear) return `${s.birthYear} –`;
  return "";
}
