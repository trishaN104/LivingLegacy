"use client";

import { useEffect, useRef, useState } from "react";
import type { Family, Memo, Subject } from "@/lib/types";
import { TreeNode } from "./TreeNode";
import { CornerOrnaments } from "./CornerOrnaments";

interface Props {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
  surname?: string;
}

// Generation-stacked layout with hand-drawn connector branches between
// related subjects. Branches are drawn from `family.tree` parent edges, so
// the visual matches the actual relationships rather than guessed positions.
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
    <section className="relative mx-auto w-full max-w-[980px] px-md pt-xl pb-2xl">
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

      <TreeBody
        generations={generations}
        byGen={byGen}
        family={family}
        memos={memos}
        currentSubjectId={currentSubjectId}
      />

      <p className="type-pullquote mt-2xl text-center text-blush-deep">
        Like branches on a tree, we all grow in different directions —{" "}
        <em>yet our roots remain as one.</em>
      </p>
    </section>
  );
}

function TreeBody({
  generations,
  byGen,
  family,
  memos,
  currentSubjectId,
}: {
  generations: number[];
  byGen: Record<number, Subject[]>;
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const w = cRect.width;
      const h = container.scrollHeight;
      setSize({ w, h });

      const next: Connector[] = [];

      // Use parent edges from the actual tree.
      const parentEdges = family.tree.filter((e) => e.kind === "parent");

      for (const e of parentEdges) {
        const top = nodeRefs.current.get(e.fromSubjectId);
        const bot = nodeRefs.current.get(e.toSubjectId);
        if (!top || !bot) continue;
        const tRect = top.getBoundingClientRect();
        const bRect = bot.getBoundingClientRect();
        const fromX = tRect.left - cRect.left + tRect.width / 2;
        const fromY = tRect.bottom - cRect.top - 6;
        const toX = bRect.left - cRect.left + bRect.width / 2;
        const toY = bRect.top - cRect.top + 6;
        // Skip pairs that aren't actually stacked (e.g. spouse loops).
        if (toY - fromY < 8) continue;
        next.push({ fromX, fromY, toX, toY });
      }

      // Spouse edges as gentle horizontal links.
      const spouseEdges = family.tree.filter((e) => e.kind === "spouse");
      for (const e of spouseEdges) {
        const a = nodeRefs.current.get(e.fromSubjectId);
        const b = nodeRefs.current.get(e.toSubjectId);
        if (!a || !b) continue;
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const fromX = aRect.right - cRect.left;
        const toX = bRect.left - cRect.left;
        if (toX - fromX < 4 || toX - fromX > 320) continue;
        const fromY =
          aRect.top + aRect.height / 2 - cRect.top - 8;
        const toY = bRect.top + bRect.height / 2 - cRect.top - 8;
        next.push({ fromX, fromY, toX, toY, kind: "spouse" });
      }

      setConnectors(next);
    }

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [generations.length, family.subjects.length, family.tree]);

  return (
    <div
      ref={containerRef}
      className="relative mt-xl rounded-2xl bg-surface/60 px-md py-xl"
    >
      <PaintedBackdrop />

      {size.w > 0 && (
        <svg
          aria-hidden
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="pointer-events-none absolute inset-0"
        >
          {connectors.map((c, i) => (
            <BranchPath key={i} c={c} />
          ))}
        </svg>
      )}

      <div className="relative z-10 flex flex-col gap-2xl">
        {generations.map((g) => (
          <div
            key={g}
            className="flex flex-wrap items-end justify-center gap-lg sm:gap-xl"
          >
            {byGen[g].map((subject) => (
              <div
                key={subject.id}
                ref={(el) => {
                  nodeRefs.current.set(subject.id, el);
                }}
              >
                <TreeNode
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
                    hasUnplayedMemoFromOrAbout(
                      subject,
                      memos,
                      currentSubjectId,
                    )
                  }
                  hrefBase="/family/profile"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type Connector = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  kind?: "parent" | "spouse";
};

function BranchPath({ c }: { c: Connector }) {
  if (c.kind === "spouse") {
    const midY = (c.fromY + c.toY) / 2;
    return (
      <path
        d={`M ${c.fromX} ${midY} L ${c.toX} ${midY}`}
        stroke="#c8b7a0"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        fill="none"
        opacity="0.7"
      />
    );
  }
  const midY = (c.fromY + c.toY) / 2;
  return (
    <g>
      <path
        d={`M ${c.fromX} ${c.fromY} C ${c.fromX} ${midY}, ${c.toX} ${midY}, ${c.toX} ${c.toY}`}
        stroke="#9c8975"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx={c.fromX} cy={c.fromY} r="3" fill="#9da98c" opacity="0.75" />
      <circle cx={c.toX} cy={c.toY} r="3" fill="#9da98c" opacity="0.75" />
    </g>
  );
}

// Subtle painted-paper backdrop — kept for warmth, no longer load-bearing
// for layout. Sits behind the connectors and node plates.
function PaintedBackdrop() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-50"
    >
      <defs>
        <radialGradient id="leafCloud" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#9da98c" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#9da98c" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#9da98c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="120" rx="220" ry="120" fill="url(#leafCloud)" />
      <ellipse cx="800" cy="120" rx="200" ry="110" fill="url(#leafCloud)" />
      <ellipse cx="500" cy="400" rx="320" ry="160" fill="url(#leafCloud)" />
      <ellipse cx="160" cy="500" rx="170" ry="90" fill="url(#leafCloud)" />
      <ellipse cx="850" cy="500" rx="170" ry="90" fill="url(#leafCloud)" />
    </svg>
  );
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
  return memos.some(
    (m) =>
      (m.recorderSubjectId === subject.id ||
        m.aboutSubjectIds.includes(subject.id)) &&
      m.recorderSubjectId !== viewerSubjectId,
  );
}
