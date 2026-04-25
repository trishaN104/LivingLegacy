"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Family, Memo, Subject, TreeEdge } from "@/lib/types";

interface Props {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
  surname?: string;
}

// FamilyTree — systems-map aesthetic.
//
// The family is laid out like a schematic / network diagram rather than a
// vertical genealogy register. Each person is a circular node placed on a
// 2D canvas; connectors are smooth Bezier curves with subtle endpoint dots
// and edge labels. A faint dot grid underlays the whole canvas to anchor
// the diagram visually. Designed for desktop first — on small screens the
// diagram falls back to a stacked list of cards (no compromised version
// of the map).
//
// Layout is computed with a deterministic algorithm:
//   1. Subjects are bucketed by generation (rows).
//   2. Each row is distributed evenly across the canvas width.
//   3. Within a row we sort by the median x of the subject's parents so
//      children sit below their parents and curves stay crisp.
//   4. Final positions are stored in node-id → {x, y} map and reused for
//      both the SVG edge rendering and the absolute-positioned HTML node
//      cards on top.

const NODE_DIAMETER = 96;
const ROW_GAP = 220;
const TOP_PADDING = 110;
const SIDE_PADDING = 80;

type Pt = { x: number; y: number };

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
    () => computeLayout(family, containerWidth),
    [family, containerWidth],
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
          Family map · schematic
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

// ─── desktop systems map ─────────────────────────────────────────────────────

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
  const { canvasWidth, canvasHeight, nodes, generationY } = layout;

  return (
    <div
      className="relative hidden lg:block"
      style={{
        width: "100%",
        height: canvasHeight,
        minHeight: 380,
      }}
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
            id="map-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="1"
              fill="var(--color-primary)"
              fillOpacity="0.08"
            />
          </pattern>
          <marker
            id="map-dot"
            viewBox="0 0 6 6"
            refX="3"
            refY="3"
            markerWidth="6"
            markerHeight="6"
          >
            <circle cx="3" cy="3" r="2" fill="var(--color-primary)" />
          </marker>
        </defs>

        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#map-grid)"
        />

        {/* Generation guidelines */}
        {Object.entries(generationY).map(([gen, y]) => (
          <g key={`gen-${gen}`}>
            <line
              x1="56"
              y1={y}
              x2={canvasWidth - 24}
              y2={y}
              stroke="var(--color-primary)"
              strokeOpacity="0.07"
              strokeDasharray="2 6"
            />
            <text
              x="20"
              y={y - 6}
              fill="var(--color-primary)"
              opacity="0.45"
              style={{
                fontFamily: "var(--font-mono, var(--font-sans))",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Gen {gen}
            </text>
          </g>
        ))}

        {/* Edges */}
        {family.tree.map((edge, i) => (
          <Edge
            key={i}
            edge={edge}
            from={nodes.get(edge.fromSubjectId)}
            to={nodes.get(edge.toSubjectId)}
          />
        ))}
      </svg>

      {/* Nodes */}
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

// ─── mobile fallback (cards) ─────────────────────────────────────────────────

function MobileFallback({
  family,
  memos,
  currentSubjectId,
}: {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
}) {
  const byGen: Record<number, Subject[]> = {};
  for (const s of family.subjects) {
    const g = s.generation ?? 1;
    (byGen[g] ??= []).push(s);
  }
  const generations = Object.keys(byGen)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="block lg:hidden">
      {generations.map((g) => (
        <section key={g} className="mb-2xl">
          <p
            className="type-metadata text-ink-tertiary"
            style={{ letterSpacing: "0.18em" }}
          >
            Generation {g}
          </p>
          <div className="mt-md grid grid-cols-2 gap-lg">
            {byGen[g].map((subject) => (
              <Link
                key={subject.id}
                href={`/family/profile/${subject.id}`}
                className="flex flex-col items-center text-center"
              >
                <RoundPortrait
                  src={subject.photoUrl}
                  alt={subject.displayName}
                  memorial={subject.status === "deceased"}
                  highlighted={subject.id === currentSubjectId}
                  hasNewMemo={
                    !!currentSubjectId &&
                    hasUnplayedMemoFromOrAbout(subject, memos, currentSubjectId)
                  }
                />
                <div
                  className={`mt-md ${
                    subject.status === "deceased"
                      ? "italic text-ink-tertiary"
                      : "text-primary"
                  }`}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  {subject.displayName}
                </div>
                <div className="type-metadata mt-1 text-ink-tertiary">
                  {subject.relationshipLabel}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── edges ───────────────────────────────────────────────────────────────────

function Edge({
  edge,
  from,
  to,
}: {
  edge: TreeEdge;
  from?: Pt;
  to?: Pt;
}) {
  if (!from || !to) return null;
  const r = NODE_DIAMETER / 2;

  if (edge.kind === "spouse") {
    // Horizontal dashed segment between the two nodes' edges.
    if (Math.abs(from.y - to.y) > 30) return null;
    const left = Math.min(from.x, to.x) + r;
    const right = Math.max(from.x, to.x) - r;
    if (right - left < 6) return null;
    const y = from.y;
    return (
      <g>
        <line
          x1={left}
          y1={y}
          x2={right}
          y2={y}
          stroke="var(--color-primary)"
          strokeOpacity="0.45"
          strokeWidth="1.25"
          strokeDasharray="3 5"
        />
        <text
          x={(left + right) / 2}
          y={y - 8}
          textAnchor="middle"
          fill="var(--color-primary)"
          opacity="0.5"
          style={{
            fontFamily: "var(--font-mono, var(--font-sans))",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          spouse
        </text>
      </g>
    );
  }

  if (edge.kind === "parent") {
    // Smooth S-curve from below `from` to above `to`.
    const x1 = from.x;
    const y1 = from.y + r + 4;
    const x2 = to.x;
    const y2 = to.y - r - 4;
    const dy = y2 - y1;
    const c1y = y1 + dy * 0.55;
    const c2y = y2 - dy * 0.55;
    const d = `M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`;
    return (
      <g>
        <path
          d={d}
          stroke="var(--color-primary)"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          fill="none"
        />
        <circle cx={x1} cy={y1} r="2.5" fill="var(--color-primary)" opacity="0.7" />
        <circle cx={x2} cy={y2} r="2.5" fill="var(--color-primary)" opacity="0.7" />
      </g>
    );
  }

  // sibling, other — render as a thin dotted hint, near the bottom of both.
  return null;
}

// ─── node card ───────────────────────────────────────────────────────────────

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
  const memorial = subject.status === "deceased";
  return (
    <Link
      href={`/family/profile/${subject.id}`}
      className="absolute group focus:outline-none"
      style={{
        left: x - NODE_DIAMETER / 2,
        top: y - NODE_DIAMETER / 2,
        width: NODE_DIAMETER,
      }}
    >
      <div className="relative">
        <RoundPortrait
          src={subject.photoUrl}
          alt={subject.displayName}
          memorial={memorial}
          highlighted={isViewer}
          hasNewMemo={hasNewMemo}
        />

        {isViewer && (
          <span
            aria-hidden
            className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tertiary px-2 py-0.5 text-on-tertiary"
            style={{
              fontFamily: "var(--font-mono, var(--font-sans))",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            You
          </span>
        )}
      </div>

      <div
        className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-center"
        style={{ width: 200 }}
      >
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
        <div
          className="mt-0.5 text-ink-tertiary tabular-nums"
          style={{
            fontFamily: "var(--font-mono, var(--font-sans))",
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
          }}
        >
          {formatDates(subject) || subject.relationshipLabel?.toUpperCase()}
        </div>
      </div>
    </Link>
  );
}

function RoundPortrait({
  src,
  alt,
  memorial,
  highlighted,
  hasNewMemo,
}: {
  src?: string;
  alt: string;
  memorial: boolean;
  highlighted: boolean;
  hasNewMemo: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = !!src && !errored;

  return (
    <div
      className={`relative mx-auto flex items-center justify-center overflow-hidden rounded-full bg-surface transition-transform duration-300 group-hover:scale-105 ${
        highlighted
          ? "shadow-[0_0_0_1px_var(--color-primary),0_0_0_3px_var(--color-surface),0_0_0_4px_var(--color-tertiary)]"
          : "ring-1 ring-primary/35"
      }`}
      style={{ width: NODE_DIAMETER, height: NODE_DIAMETER }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={NODE_DIAMETER}
          height={NODE_DIAMETER}
          onError={() => setErrored(true)}
          className={`absolute inset-0 h-full w-full object-cover ${
            memorial ? "saturate-0 opacity-80" : ""
          }`}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-surface text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            fontWeight: 600,
            opacity: 0.55,
          }}
        >
          {alt
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      )}
      {hasNewMemo && (
        <span
          aria-label="New memo waiting"
          className="absolute right-1 top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-tertiary ring-2 ring-surface"
        />
      )}
    </div>
  );
}

// ─── legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="mt-2xl flex flex-wrap items-center gap-lg border-t border-primary/10 pt-lg">
      <LegendItem
        swatch={
          <svg width="36" height="10" viewBox="0 0 36 10">
            <path
              d="M2 5 C 12 0, 24 10, 34 5"
              stroke="var(--color-primary)"
              strokeOpacity="0.55"
              strokeWidth="1.25"
              fill="none"
            />
          </svg>
        }
        label="Parent → child"
      />
      <LegendItem
        swatch={
          <svg width="36" height="10" viewBox="0 0 36 10">
            <line
              x1="2"
              y1="5"
              x2="34"
              y2="5"
              stroke="var(--color-primary)"
              strokeOpacity="0.45"
              strokeWidth="1.25"
              strokeDasharray="3 5"
            />
          </svg>
        }
        label="Spouse"
      />
      <LegendItem
        swatch={
          <span className="inline-block h-3 w-3 rounded-full bg-tertiary" />
        }
        label="New memo waiting"
      />
      <LegendItem
        swatch={
          <span className="inline-block h-3 w-3 rounded-full bg-surface ring-1 ring-primary" />
        }
        label="Tap a node to open their page"
      />
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

// ─── layout ──────────────────────────────────────────────────────────────────

type LayoutResult = {
  canvasWidth: number;
  canvasHeight: number;
  nodes: Map<string, Pt>;
  generationY: Record<number, number>;
};

function computeLayout(family: Family, containerWidth: number): LayoutResult {
  const canvasWidth = Math.max(containerWidth, 720);
  const usable = canvasWidth - SIDE_PADDING * 2;

  const byGen: Record<number, Subject[]> = {};
  for (const s of family.subjects) {
    const g = s.generation ?? 1;
    (byGen[g] ??= []).push(s);
  }
  const generations = Object.keys(byGen)
    .map(Number)
    .sort((a, b) => a - b);

  const nodes = new Map<string, Pt>();
  const generationY: Record<number, number> = {};

  generations.forEach((g, gi) => {
    const y = TOP_PADDING + gi * ROW_GAP;
    generationY[g] = y;

    let row = byGen[g];

    // Sort children by parent midpoint to keep curves crisp.
    if (gi > 0) {
      const parentX = (sub: Subject): number => {
        const parents = family.tree
          .filter((e) => e.kind === "parent" && e.toSubjectId === sub.id)
          .map((e) => nodes.get(e.fromSubjectId)?.x)
          .filter((x): x is number => typeof x === "number");
        if (parents.length === 0) return 0;
        return parents.reduce((a, b) => a + b, 0) / parents.length;
      };
      row = [...row].sort((a, b) => parentX(a) - parentX(b));
    } else {
      row = [...row].sort(
        (a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0),
      );
    }

    const count = row.length;
    if (count === 1) {
      nodes.set(row[0].id, { x: SIDE_PADDING + usable / 2, y });
    } else {
      const step = usable / (count - 1);
      row.forEach((sub, i) => {
        nodes.set(sub.id, { x: SIDE_PADDING + step * i, y });
      });
    }
  });

  const canvasHeight =
    TOP_PADDING + generations.length * ROW_GAP + 60;

  return { canvasWidth, canvasHeight, nodes, generationY };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveSurname(familyName: string): string | null {
  const m = familyName.match(/^The (.+) family$/i);
  if (m) return m[1];
  return familyName;
}

function formatDates(s: Subject): string {
  if (s.status === "deceased" && s.birthYear && s.deathYear) {
    return `${s.birthYear}–${s.deathYear}`;
  }
  if (s.birthYear) return `${s.birthYear}–`;
  return "";
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
