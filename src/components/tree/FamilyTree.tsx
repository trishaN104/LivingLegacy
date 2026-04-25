"use client";

import type { Family, Memo, Subject } from "@/lib/types";
import { TreeIllustration } from "./TreeIllustration";
import { TreeNode } from "./TreeNode";
import { CornerOrnaments } from "./CornerOrnaments";

interface Props {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
  surname?: string; // displayed in the page title — defaults to last word of family.name
}

// Generation-stacked layout. Top-down: ancestors → parents → children. The
// painted backdrop's branch positions are tuned to align with these rows.
export function FamilyTree({ family, memos, currentSubjectId, surname }: Props) {
  const byGen: Record<number, Subject[]> = {};
  for (const s of family.subjects) {
    const g = s.generation ?? 1;
    (byGen[g] ??= []).push(s);
  }
  const generations = Object.keys(byGen)
    .map(Number)
    .sort((a, b) => a - b);

  const computedSurname =
    surname ?? deriveSurname(family.name) ?? "Your family";

  return (
    <div className="relative mx-auto w-full max-w-[980px] px-md py-2xl">
      <CornerOrnaments />

      <header className="relative z-10 text-center">
        <h1 className="type-ornamental text-foliage-deep">{computedSurname}</h1>
        <p className="type-metadata mt-1 text-blush-deep">FAMILY TREE</p>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="block h-px w-16 bg-divider" />
          <span aria-hidden className="text-blush-deep">❀</span>
          <span className="block h-px w-16 bg-divider" />
        </div>
      </header>

      <div className="relative mt-xl">
        {/* Painted backdrop fills the canvas behind the nodes */}
        <div
          className="relative w-full"
          style={{ aspectRatio: "10 / 10" }}
        >
          <TreeIllustration />

          {/* Generation rows positioned over the painted branches.
              Y percentages match the SVG viewBox y-positions. */}
          {generations.map((g, i) => (
            <div
              key={g}
              className="absolute left-0 right-0 flex items-end justify-center gap-xl"
              style={{
                top: `${rowYPercent(i, generations.length)}%`,
                transform: "translateY(-50%)",
              }}
            >
              {byGen[g].map((subject) => (
                <TreeNode
                  key={subject.id}
                  subject={subject}
                  variant={
                    g === 0
                      ? "ancestral"
                      : subject.status === "deceased"
                        ? "memorial"
                        : "default"
                  }
                  hasNewMemo={
                    !!currentSubjectId &&
                    hasUnplayedMemoFromOrAbout(subject, memos, currentSubjectId)
                  }
                  hrefBase="/family/profile"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="type-pullquote mt-xl text-center text-blush-deep">
        Like branches on a tree, we all grow in different directions —{" "}
        <em>yet our roots remain as one.</em>
      </p>
    </div>
  );
}

function rowYPercent(index: number, total: number): number {
  // Top row (ancestors): 13%. Bottom row (youngest): 78%. Even spacing in between.
  if (total === 1) return 50;
  const top = 14;
  const bottom = 78;
  return top + ((bottom - top) * index) / (total - 1);
}

function deriveSurname(familyName: string): string | null {
  const m = familyName.match(/^The (.+) family$/i);
  if (m) return m[1].toUpperCase();
  return familyName.toUpperCase();
}

function hasUnplayedMemoFromOrAbout(
  subject: Subject,
  memos: Memo[],
  viewerSubjectId: string,
): boolean {
  // Demo: any memo where the subject is the recorder or a referenced "about"
  // and the viewer is in the audience. Real product tracks "played" state per
  // viewer, not in this hackathon scope.
  return memos.some(
    (m) =>
      (m.recorderSubjectId === subject.id ||
        m.aboutSubjectIds.includes(subject.id)) &&
      m.recorderSubjectId !== viewerSubjectId,
  );
}
