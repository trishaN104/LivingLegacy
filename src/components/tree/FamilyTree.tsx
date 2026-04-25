"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Family, Memo, Subject } from "@/lib/types";

interface Props {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
  surname?: string;
}

// FamilyTree — genogram-style schematic.
//
// Layout principles (rebuilt 2026-04 per the structural-bug pass):
//
//   1. Generations are anchored on the viewer (YOU). Whoever has the YOU
//      tag is GEN 0. Ancestors above are GEN +1, +2…, descendants below
//      are GEN -1, -2…. Generation labels render in a fixed-width left
//      margin so they never clip.
//
//   2. Each generation is a strict horizontal band. Every node in a
//      generation shares the same y. Nodes never free-float between bands.
//
//   3. The viewer's spouse group (viewer + their spouses) is centered as a
//      unit on canvas-center. Ancestors are placed above their children;
//      a sole ancestor like Grandma sits directly above her child so the
//      parent-of edge is a short vertical line, not a long arc.
//
//   4. Children of a couple are grouped under the marriage midpoint and
//      distributed evenly with SIBLING_GAP, ordered left-to-right by
//      birth year.
//
//   5. Edges are orthogonal genogram routing:
//
//          parent couple
//          (drop from marriage midpoint)
//                │
//          ──────┼──────  bus row
//          │           │
//        child       child
//
//      Spouse edges are short dashed horizontals between the two nodes
//      only — never spanning the canvas. Sibling edges are not drawn
//      (parent edges already encode that).
//
//   6. Nodes are uniform 88px circles with the person's initial. The YOU
//      node gets a double-stroke ring treatment — no floating pill that
//      overlaps the circle boundary. Deceased subjects get a faded fill
//      and a thin diagonal slash.

type Pt = { x: number; y: number };

const NODE_DIAMETER = 88;
const NODE_RADIUS = NODE_DIAMETER / 2;
// Row gap is generous enough that a parent's label (which sits below the
// circle) can never collide horizontally with the bus row routed between
// generations. With LABEL_BLOCK_HEIGHT ~ 64px below the circle, a 280px
// row gap leaves ~ 80px of clear vertical space for the bus + child drops
// even at deep generations.
const ROW_GAP = 280;
const TOP_PADDING = 110;
const LEFT_PADDING = 96;
const RIGHT_PADDING = 60;
const SPOUSE_GAP = 240;
const SIBLING_GAP = 220;
// Narrower than the spacer between adjacent nodes (SPOUSE_GAP/SIBLING_GAP
// minus circles) so a parent-couple's drop column lands cleanly between
// the two parent labels rather than slicing through one of them.
const NODE_LABEL_WIDTH = 160;
const BOTTOM_PADDING = 140;

export function FamilyTree({ family, memos, currentSubjectId, surname }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1100);

  useEffect(() => {
    function measure() {
      const w = containerRef.current?.clientWidth ?? 1100;
      setContainerWidth(w);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const layout = useMemo(
    () => computeLayout(family, currentSubjectId, containerWidth),
    [family, currentSubjectId, containerWidth],
  );

  const computedSurname =
    surname ?? deriveSurname(family.name) ?? "Your family";
  const earliestYear = family.subjects
    .map((s) => s.birthYear)
    .filter((y): y is number => typeof y === "number")
    .sort((a, b) => a - b)[0];

  return (
    <section className="mx-auto mt-xl w-full max-w-[1280px] px-md sm:px-lg">
      <Header
        surname={computedSurname}
        earliest={earliestYear}
        count={family.subjects.length}
      />

      <div ref={containerRef} className="relative mt-2xl">
        <DesktopMap
          family={family}
          layout={layout}
          memos={memos}
          currentSubjectId={currentSubjectId}
        />
        <MobileFallback
          family={family}
          memos={memos}
          currentSubjectId={currentSubjectId}
        />
      </div>

      <Legend />
    </section>
  );
}

// ─── header ──────────────────────────────────────────────────────────────────

function Header({
  surname,
  earliest,
  count,
}: {
  surname: string;
  earliest?: number;
  count: number;
}) {
  return (
    <header className="rise pb-lg">
      <div className="flex items-baseline justify-between gap-md">
        <p
          className="type-metadata text-ink-tertiary"
          style={{ letterSpacing: "0.18em" }}
        >
          Family map · genogram
        </p>
        <p
          className="type-metadata text-ink-tertiary tabular-nums"
          style={{ letterSpacing: "0.12em" }}
        >
          {String(count).padStart(2, "0")} nodes
          {earliest ? ` · est. ${earliest}` : ""}
        </p>
      </div>
      <h1
        className="mt-md text-primary"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-display-xl)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 0.95,
          fontVariationSettings: "'SOFT' 50, 'opsz' 144",
        }}
      >
        {surname}
      </h1>
      <div className="mt-md h-px w-full bg-primary opacity-15" />
    </header>
  );
}

// ─── desktop map ─────────────────────────────────────────────────────────────

function DesktopMap({
  family,
  layout,
  memos,
  currentSubjectId,
}: {
  family: Family;
  layout: LayoutResult;
  memos: Memo[];
  currentSubjectId: string | null;
}) {
  const { canvasWidth, canvasHeight, nodes, generationY, viewerRelGen } =
    layout;
  const sortedRels = Object.keys(generationY)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div
      className="relative hidden lg:block"
      style={{ width: "100%", height: canvasHeight, minHeight: 480 }}
    >
      <svg
        aria-hidden
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="absolute inset-0"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <pattern
            id="genogram-dots"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="0.9"
              fill="var(--color-primary)"
              fillOpacity="0.05"
            />
          </pattern>
          {/* Slash mask for deceased nodes — drawn in the foreground layer */}
        </defs>

        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#genogram-dots)"
        />

        {/* Generation guide rows */}
        {sortedRels.map((rel) => {
          const y = generationY[rel];
          const label = formatGenLabel(rel);
          const isAnchor = rel === 0 && viewerRelGen !== null;
          return (
            <g key={`gen-${rel}`}>
              <line
                x1={LEFT_PADDING}
                y1={y}
                x2={canvasWidth - RIGHT_PADDING / 2}
                y2={y}
                stroke="var(--color-primary)"
                strokeOpacity={isAnchor ? "0.14" : "0.07"}
                strokeDasharray="2 6"
              />
              <text
                x={LEFT_PADDING - 14}
                y={y - 8}
                textAnchor="end"
                fill="var(--color-primary)"
                opacity={isAnchor ? "0.7" : "0.45"}
                style={{
                  fontFamily: "var(--font-mono, var(--font-sans))",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Parent edges (orthogonal "T" routing per parent set) */}
        {layout.parentBranches.map((branch, i) => (
          <ParentBranch key={`branch-${i}`} branch={branch} />
        ))}

        {/* Spouse edges (short dashed horizontals between adjacent nodes) */}
        {layout.spouseLinks.map((link, i) => (
          <SpouseLink key={`sp-${i}`} a={link.a} b={link.b} />
        ))}
      </svg>

      {/* Foreground nodes */}
      {family.subjects.map((subject) => {
        const pos = nodes.get(subject.id);
        if (!pos) return null;
        return (
          <NodeCard
            key={subject.id}
            subject={subject}
            x={pos.x}
            y={pos.y}
            isViewer={subject.id === currentSubjectId}
            hasNewMemo={
              !!currentSubjectId &&
              hasUnplayedMemoFromOrAbout(subject, memos, currentSubjectId)
            }
          />
        );
      })}
    </div>
  );
}

// ─── parent edge: orthogonal "T" routing ─────────────────────────────────────

type Branch = {
  parentMidX: number;
  parentBottomY: number;
  busY: number;
  childTops: { x: number; y: number }[];
};

function ParentBranch({ branch }: { branch: Branch }) {
  const { parentMidX, parentBottomY, busY, childTops } = branch;

  if (childTops.length === 0) return null;

  // Single child sharing the parent's column → just one straight vertical.
  if (
    childTops.length === 1 &&
    Math.abs(childTops[0].x - parentMidX) < 1
  ) {
    const c = childTops[0];
    return (
      <line
        x1={parentMidX}
        y1={parentBottomY}
        x2={c.x}
        y2={c.y}
        stroke="var(--color-primary)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
    );
  }

  const childXs = childTops.map((c) => c.x).sort((a, b) => a - b);
  const leftX = Math.min(parentMidX, childXs[0]);
  const rightX = Math.max(parentMidX, childXs[childXs.length - 1]);

  return (
    <g
      stroke="var(--color-primary)"
      strokeOpacity="0.55"
      strokeWidth="1.5"
      fill="none"
    >
      {/* Drop from parent / marriage midpoint to the bus */}
      <line x1={parentMidX} y1={parentBottomY} x2={parentMidX} y2={busY} />
      {/* Horizontal bus across the children */}
      <line x1={leftX} y1={busY} x2={rightX} y2={busY} />
      {/* Vertical drop to each child */}
      {childTops.map((c, i) => (
        <line key={i} x1={c.x} y1={busY} x2={c.x} y2={c.y} />
      ))}
    </g>
  );
}

function SpouseLink({ a, b }: { a: Pt; b: Pt }) {
  if (Math.abs(a.y - b.y) > 30) return null;
  const left = Math.min(a.x, b.x) + NODE_RADIUS;
  const right = Math.max(a.x, b.x) - NODE_RADIUS;
  if (right - left < 8) return null;
  const y = a.y;
  return (
    <g>
      <line
        x1={left}
        y1={y}
        x2={right}
        y2={y}
        stroke="var(--color-primary)"
        strokeOpacity="0.5"
        strokeWidth="1.25"
        strokeDasharray="3 5"
      />
    </g>
  );
}

// ─── mobile fallback ─────────────────────────────────────────────────────────

function MobileFallback({
  family,
  memos,
  currentSubjectId,
}: {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
}) {
  const viewer = currentSubjectId
    ? family.subjects.find((s) => s.id === currentSubjectId)
    : undefined;
  const viewerAbsGen = viewer?.generation ?? medianGeneration(family);
  const grouped: Record<number, Subject[]> = {};
  for (const s of family.subjects) {
    const rel = viewerAbsGen - (s.generation ?? viewerAbsGen);
    (grouped[rel] ??= []).push(s);
  }
  const sortedRels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="block lg:hidden">
      {sortedRels.map((rel) => (
        <section key={rel} className="mb-2xl">
          <p
            className="type-metadata text-ink-tertiary"
            style={{ letterSpacing: "0.18em" }}
          >
            {formatGenLabel(rel)}
          </p>
          <div className="mt-md grid grid-cols-2 gap-lg">
            {grouped[rel]
              .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0))
              .map((subject) => (
                <Link
                  key={subject.id}
                  href={`/family/profile/${subject.id}`}
                  className="flex flex-col items-center text-center"
                >
                  <NodeCircle
                    subject={subject}
                    isViewer={subject.id === currentSubjectId}
                    hasNewMemo={
                      !!currentSubjectId &&
                      hasUnplayedMemoFromOrAbout(
                        subject,
                        memos,
                        currentSubjectId,
                      )
                    }
                  />
                  <NodeLabel subject={subject} />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── node ────────────────────────────────────────────────────────────────────

function NodeCard({
  subject,
  x,
  y,
  isViewer,
  hasNewMemo,
}: {
  subject: Subject;
  x: number;
  y: number;
  isViewer: boolean;
  hasNewMemo: boolean;
}) {
  return (
    <Link
      href={`/family/profile/${subject.id}`}
      className="absolute group focus:outline-none"
      style={{
        left: x - NODE_RADIUS,
        top: y - NODE_RADIUS,
        width: NODE_DIAMETER,
      }}
    >
      <NodeCircle
        subject={subject}
        isViewer={isViewer}
        hasNewMemo={hasNewMemo}
      />
      {/* The label sits on top of the edges-SVG (later in DOM order) and the
          solid bg-surface acts as a visual eraser so vertical drops at this
          column don't appear to slice through the name + dates. Without
          this, a single-parent chain like Grandma → Mom shows the parent
          edge passing through Grandma's own label. */}
      <div
        className="absolute left-1/2 top-full mt-2 -translate-x-1/2 text-center bg-surface px-3 py-1 rounded-md"
        style={{ width: NODE_LABEL_WIDTH }}
      >
        <NodeLabel subject={subject} />
      </div>
    </Link>
  );
}

function NodeCircle({
  subject,
  isViewer,
  hasNewMemo,
}: {
  subject: Subject;
  isViewer: boolean;
  hasNewMemo: boolean;
}) {
  const memorial = subject.status === "deceased";
  const initials = getInitials(subject);
  return (
    <div
      className="relative mx-auto transition-transform duration-300 group-hover:scale-105"
      style={{ width: NODE_DIAMETER, height: NODE_DIAMETER }}
    >
      <svg
        width={NODE_DIAMETER}
        height={NODE_DIAMETER}
        viewBox={`0 0 ${NODE_DIAMETER} ${NODE_DIAMETER}`}
        aria-hidden
      >
        {/* Inner fill */}
        <circle
          cx={NODE_RADIUS}
          cy={NODE_RADIUS}
          r={NODE_RADIUS - 1.5}
          fill={memorial ? "var(--color-surface-elevated)" : "var(--color-surface)"}
          stroke="var(--color-primary)"
          strokeOpacity={memorial ? "0.35" : "0.55"}
          strokeWidth="1.25"
        />
        {/* YOU treatment: a second concentric ring in the accent color */}
        {isViewer && (
          <circle
            cx={NODE_RADIUS}
            cy={NODE_RADIUS}
            r={NODE_RADIUS - 5}
            fill="none"
            stroke="var(--color-tertiary)"
            strokeWidth="1.5"
          />
        )}
        {/* Initials */}
        <text
          x={NODE_RADIUS}
          y={NODE_RADIUS + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-primary)"
          opacity={memorial ? 0.6 : 0.85}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {initials}
        </text>
        {/* Deceased: thin diagonal slash through the circle */}
        {memorial && (
          <line
            x1={NODE_RADIUS - NODE_RADIUS * 0.78}
            y1={NODE_RADIUS + NODE_RADIUS * 0.78}
            x2={NODE_RADIUS + NODE_RADIUS * 0.78}
            y2={NODE_RADIUS - NODE_RADIUS * 0.78}
            stroke="var(--color-primary)"
            strokeOpacity="0.5"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        )}
      </svg>
      {hasNewMemo && (
        <span
          aria-label="New memo waiting"
          className="absolute right-0 top-0 inline-flex h-3 w-3 rounded-full bg-tertiary ring-2 ring-surface"
        />
      )}
    </div>
  );
}

function NodeLabel({ subject }: { subject: Subject }) {
  const memorial = subject.status === "deceased";
  const dates = formatDates(subject);
  return (
    <>
      <div
        className={`leading-tight ${
          memorial ? "italic text-ink-tertiary" : "text-primary"
        }`}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.0625rem",
          fontWeight: 600,
          letterSpacing: "-0.005em",
        }}
      >
        {subject.displayName}
      </div>
      {subject.fullName && subject.fullName !== subject.displayName && (
        <div
          className="mt-0.5 text-ink-tertiary"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.6875rem",
            letterSpacing: "0.05em",
          }}
        >
          {subject.fullName}
        </div>
      )}
      {dates && (
        <div
          className="mt-0.5 text-ink-tertiary tabular-nums"
          style={{
            fontFamily: "var(--font-mono, var(--font-sans))",
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
          }}
        >
          {dates}
        </div>
      )}
    </>
  );
}

// ─── legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="mt-2xl flex flex-col gap-md border-t border-primary/10 pt-lg">
      <p
        className="type-metadata text-ink-tertiary"
        style={{ letterSpacing: "0.18em" }}
      >
        Generations are anchored on YOU · ancestors GEN +1, +2 above · descendants GEN −1, −2 below
      </p>
      <div className="flex flex-wrap items-center gap-lg">
        <LegendItem
          swatch={
            <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden>
              <path
                d="M18 1 L18 7 M5 7 L31 7 M5 7 L5 13 M31 7 L31 13"
                stroke="var(--color-primary)"
                strokeOpacity="0.6"
                strokeWidth="1.4"
                fill="none"
              />
            </svg>
          }
          label="Parent → child"
        />
        <LegendItem
          swatch={
            <svg width="36" height="10" viewBox="0 0 36 10" aria-hidden>
              <line
                x1="3"
                y1="5"
                x2="33"
                y2="5"
                stroke="var(--color-primary)"
                strokeOpacity="0.5"
                strokeWidth="1.25"
                strokeDasharray="3 5"
              />
            </svg>
          }
          label="Spouse"
        />
        <LegendItem
          swatch={
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              <circle
                cx="11"
                cy="11"
                r="9"
                fill="var(--color-surface)"
                stroke="var(--color-primary)"
                strokeOpacity="0.55"
                strokeWidth="1.25"
              />
              <circle
                cx="11"
                cy="11"
                r="6"
                fill="none"
                stroke="var(--color-tertiary)"
                strokeWidth="1.4"
              />
            </svg>
          }
          label="You"
        />
        <LegendItem
          swatch={
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              <circle
                cx="11"
                cy="11"
                r="9"
                fill="var(--color-surface-elevated)"
                stroke="var(--color-primary)"
                strokeOpacity="0.4"
                strokeWidth="1.25"
              />
              <line
                x1="4"
                y1="18"
                x2="18"
                y2="4"
                stroke="var(--color-primary)"
                strokeOpacity="0.5"
                strokeWidth="1.25"
              />
            </svg>
          }
          label="In memoriam"
        />
        <LegendItem
          swatch={
            <span className="inline-block h-3 w-3 rounded-full bg-tertiary" />
          }
          label="New memo waiting"
        />
      </div>
    </div>
  );
}

function LegendItem({
  swatch,
  label,
}: {
  swatch: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 type-metadata text-ink-tertiary">
      {swatch}
      <span style={{ letterSpacing: "0.05em" }}>{label}</span>
    </span>
  );
}

// ─── layout engine ───────────────────────────────────────────────────────────

type LayoutResult = {
  canvasWidth: number;
  canvasHeight: number;
  nodes: Map<string, Pt>;
  generationY: Record<number, number>;
  parentBranches: Branch[];
  spouseLinks: { a: Pt; b: Pt }[];
  viewerRelGen: number | null;
};

function computeLayout(
  family: Family,
  viewerSubjectId: string | null,
  containerWidth: number,
): LayoutResult {
  const W = Math.max(containerWidth, 720);
  const usable = Math.max(W - LEFT_PADDING - RIGHT_PADDING, 480);
  const centerX = LEFT_PADDING + usable / 2;

  // 1. Resolve viewer's absolute generation. Falls back to the median so the
  //    diagram still renders sensibly before the user picks a profile.
  const viewer = viewerSubjectId
    ? family.subjects.find((s) => s.id === viewerSubjectId) ?? null
    : null;
  const viewerAbsGen = viewer?.generation ?? medianGeneration(family);

  // 2. Compute relative generation per subject. By convention: ancestors
  //    above are positive, descendants below are negative, viewer is 0.
  const relOf = new Map<string, number>();
  for (const s of family.subjects) {
    const abs = s.generation ?? viewerAbsGen;
    relOf.set(s.id, viewerAbsGen - abs);
  }

  const byRel = new Map<number, Subject[]>();
  for (const s of family.subjects) {
    const r = relOf.get(s.id)!;
    if (!byRel.has(r)) byRel.set(r, []);
    byRel.get(r)!.push(s);
  }

  // 3. Y per row — highest rel at top.
  const sortedRels = Array.from(byRel.keys()).sort((a, b) => b - a);
  const generationY: Record<number, number> = {};
  sortedRels.forEach((r, i) => {
    generationY[r] = TOP_PADDING + i * ROW_GAP;
  });

  const nodes = new Map<string, Pt>();

  // 4. Place row 0 first: viewer + their spouses, centered as a unit.
  const row0 = byRel.get(0) ?? [];
  const spouseIds = new Set<string>();
  if (viewer) {
    spouseIds.add(viewer.id);
    for (const e of family.tree) {
      if (e.kind !== "spouse") continue;
      if (e.fromSubjectId === viewer.id) spouseIds.add(e.toSubjectId);
      if (e.toSubjectId === viewer.id) spouseIds.add(e.fromSubjectId);
    }
  }

  const spousePair = row0
    .filter((s) => spouseIds.has(s.id))
    .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0));

  // If the viewer hasn't been resolved, treat all of row-0 as a centered
  // group. This keeps the unauthenticated render symmetric.
  const groupForCentering = viewer ? spousePair : row0;
  const centerCount = Math.max(groupForCentering.length, 1);
  const groupSpan = (centerCount - 1) * SPOUSE_GAP;
  const groupStart = centerX - groupSpan / 2;

  groupForCentering.forEach((s, i) => {
    nodes.set(s.id, { x: groupStart + i * SPOUSE_GAP, y: generationY[0] });
  });

  // Anyone else on row 0 (e.g. siblings of the viewer that aren't spouses)
  // is placed to the right of the centered group, sorted by birth year.
  let rightCursor = groupStart + groupSpan + SPOUSE_GAP;
  const rest = row0
    .filter((s) => !nodes.has(s.id))
    .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0));
  for (const s of rest) {
    nodes.set(s.id, { x: rightCursor, y: generationY[0] });
    rightCursor += SIBLING_GAP;
  }

  // 5. Ancestor rows — top down. Each ancestor sits above the midpoint of
  //    their already-placed children (children are closer to the viewer
  //    and were placed in the row immediately below). Ancestors that share
  //    the same anchor x are nudged apart by SPOUSE_GAP so circles don't
  //    overlap.
  const ascendingRels = sortedRels.filter((r) => r > 0).sort((a, b) => a - b);
  for (const r of ascendingRels) {
    const row = byRel.get(r) ?? [];
    const anchored = row.map((s) => ({
      subject: s,
      anchor: ancestorAnchorX(s, family, nodes, centerX),
    }));
    anchored.sort((a, b) => a.anchor - b.anchor);

    let lastX = -Infinity;
    for (const { subject, anchor } of anchored) {
      let x = anchor;
      if (x - lastX < SPOUSE_GAP) x = lastX + SPOUSE_GAP;
      nodes.set(subject.id, { x, y: generationY[r] });
      lastX = x;
    }
  }

  // 6. Descendant rows — top down. Group children by their parent set so
  //    each set can fan out under its couple's marriage midpoint.
  const descendingRels = sortedRels.filter((r) => r < 0).sort((a, b) => b - a);
  for (const r of descendingRels) {
    const row = byRel.get(r) ?? [];

    // child id → sorted parent-set key; parent-set key → child list
    const parentsByChild = new Map<string, string[]>();
    for (const s of row) parentsByChild.set(s.id, []);
    for (const e of family.tree) {
      if (e.kind !== "parent") continue;
      if (parentsByChild.has(e.toSubjectId)) {
        parentsByChild.get(e.toSubjectId)!.push(e.fromSubjectId);
      }
    }
    const groups = new Map<string, { parents: string[]; children: Subject[] }>();
    for (const s of row) {
      const ps = (parentsByChild.get(s.id) ?? []).slice().sort();
      const key = ps.join("|") || `__orphan__:${s.id}`;
      if (!groups.has(key)) groups.set(key, { parents: ps, children: [] });
      groups.get(key)!.children.push(s);
    }

    // Place groups in order of their parent-set midpoint.
    const ordered = Array.from(groups.values())
      .map((g) => ({
        ...g,
        mid: parentSetMidpoint(g.parents, nodes, centerX),
      }))
      .sort((a, b) => a.mid - b.mid);

    let lastRight = -Infinity;
    for (const g of ordered) {
      const sorted = g.children
        .slice()
        .sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0));
      const span = (sorted.length - 1) * SIBLING_GAP;
      let startX = g.mid - span / 2;
      if (startX < lastRight + SIBLING_GAP) startX = lastRight + SIBLING_GAP;
      sorted.forEach((s, i) => {
        nodes.set(s.id, { x: startX + i * SIBLING_GAP, y: generationY[r] });
      });
      lastRight = startX + span;
    }
  }

  // 7. Build edges.
  const parentBranches = buildParentBranches(family, nodes, generationY);
  const spouseLinks = buildSpouseLinks(family, nodes);

  // 8. Compute canvas dimensions to fit everything plus the bottom labels.
  const xs = Array.from(nodes.values()).map((p) => p.x);
  const minX = xs.length ? Math.min(...xs) : LEFT_PADDING;
  const maxX = xs.length ? Math.max(...xs) : LEFT_PADDING + usable;
  const requiredRight = maxX + NODE_RADIUS + RIGHT_PADDING;
  const requiredLeft = LEFT_PADDING - 4; // generation labels need this much
  const canvasWidth = Math.max(W, requiredRight, requiredLeft + usable);

  const lastY =
    sortedRels.length > 0
      ? generationY[sortedRels[sortedRels.length - 1]]
      : TOP_PADDING;
  const canvasHeight = lastY + BOTTOM_PADDING;

  // Center everything horizontally if the actual content is narrower than
  // the canvas (avoids a left-leaning layout when rendered into a wide
  // container).
  const contentWidth = maxX - minX;
  const desiredCenter = LEFT_PADDING + (canvasWidth - LEFT_PADDING - RIGHT_PADDING) / 2;
  const actualCenter = (minX + maxX) / 2;
  const shift = desiredCenter - actualCenter;
  if (Math.abs(shift) > 1 && xs.length > 1) {
    for (const [id, p] of nodes.entries()) {
      nodes.set(id, { x: p.x + shift, y: p.y });
    }
    // Rebuild edges with shifted positions.
    const rebuiltBranches = buildParentBranches(family, nodes, generationY);
    const rebuiltSpouses = buildSpouseLinks(family, nodes);
    return {
      canvasWidth,
      canvasHeight,
      nodes,
      generationY,
      parentBranches: rebuiltBranches,
      spouseLinks: rebuiltSpouses,
      viewerRelGen: viewer ? 0 : null,
    };
  }

  return {
    canvasWidth,
    canvasHeight,
    nodes,
    generationY,
    parentBranches,
    spouseLinks,
    viewerRelGen: viewer ? 0 : null,
  };
}

function ancestorAnchorX(
  ancestor: Subject,
  family: Family,
  nodes: Map<string, Pt>,
  centerX: number,
): number {
  const childIds = family.tree
    .filter((e) => e.kind === "parent" && e.fromSubjectId === ancestor.id)
    .map((e) => e.toSubjectId);
  const xs = childIds
    .map((id) => nodes.get(id)?.x)
    .filter((x): x is number => typeof x === "number");
  if (xs.length === 0) return centerX;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function parentSetMidpoint(
  parentIds: string[],
  nodes: Map<string, Pt>,
  fallback: number,
): number {
  const xs = parentIds
    .map((id) => nodes.get(id)?.x)
    .filter((x): x is number => typeof x === "number");
  if (xs.length === 0) return fallback;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function buildParentBranches(
  family: Family,
  nodes: Map<string, Pt>,
  generationY: Record<number, number>,
): Branch[] {
  // Group parent edges by the (sorted) parent set of each child.
  const childParents = new Map<string, string[]>();
  for (const e of family.tree) {
    if (e.kind !== "parent") continue;
    if (!childParents.has(e.toSubjectId)) childParents.set(e.toSubjectId, []);
    childParents.get(e.toSubjectId)!.push(e.fromSubjectId);
  }

  const groups = new Map<string, { parents: string[]; children: string[] }>();
  for (const [child, parents] of childParents.entries()) {
    const key = parents.slice().sort().join("|");
    if (!groups.has(key)) {
      groups.set(key, { parents: parents.slice().sort(), children: [] });
    }
    groups.get(key)!.children.push(child);
  }

  const branches: Branch[] = [];
  for (const { parents, children } of groups.values()) {
    const parentPts = parents
      .map((id) => nodes.get(id))
      .filter((p): p is Pt => !!p);
    const childPts = children
      .map((id) => nodes.get(id))
      .filter((p): p is Pt => !!p);
    if (parentPts.length === 0 || childPts.length === 0) continue;

    const parentMidX =
      parentPts.reduce((a, p) => a + p.x, 0) / parentPts.length;
    const parentBottomY =
      Math.max(...parentPts.map((p) => p.y)) + NODE_RADIUS + 4;
    const childTopY =
      Math.min(...childPts.map((p) => p.y)) - NODE_RADIUS - 4;
    const busY = parentBottomY + (childTopY - parentBottomY) * 0.5;

    branches.push({
      parentMidX,
      parentBottomY,
      busY,
      childTops: childPts.map((p) => ({ x: p.x, y: childTopY })),
    });
  }

  // Suppress the unused param warning — generationY is kept on the
  // function signature so future caller refactors can rely on it without
  // re-threading.
  void generationY;
  return branches;
}

function buildSpouseLinks(
  family: Family,
  nodes: Map<string, Pt>,
): { a: Pt; b: Pt }[] {
  const out: { a: Pt; b: Pt }[] = [];
  for (const e of family.tree) {
    if (e.kind !== "spouse") continue;
    const a = nodes.get(e.fromSubjectId);
    const b = nodes.get(e.toSubjectId);
    if (!a || !b) continue;
    out.push({ a, b });
  }
  return out;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveSurname(familyName: string): string | null {
  const m = familyName.match(/^The (.+) family$/i);
  if (m) return m[1];
  return familyName;
}

function formatGenLabel(rel: number): string {
  if (rel === 0) return "GEN 0 · YOU";
  const sign = rel > 0 ? "+" : "−";
  return `GEN ${sign}${Math.abs(rel)}`;
}

function formatDates(s: Subject): string {
  if (s.status === "deceased" && s.birthYear && s.deathYear) {
    return `${s.birthYear}–${s.deathYear}`;
  }
  if (s.birthYear) return `${s.birthYear}–`;
  return "";
}

function getInitials(s: Subject): string {
  const source = s.fullName || s.displayName;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

function medianGeneration(family: Family): number {
  const gens = family.subjects
    .map((s) => s.generation)
    .filter((g): g is number => typeof g === "number")
    .sort((a, b) => a - b);
  if (gens.length === 0) return 1;
  return gens[Math.floor(gens.length / 2)];
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
