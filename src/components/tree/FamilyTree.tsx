"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Family, Memo, Subject } from "@/lib/types";

interface Props {
  family: Family;
  memos: Memo[];
  currentSubjectId: string | null;
  surname?: string;
}

// FamilyTree — printed-register aesthetic.
//
// Rather than a painted illustration, the tree is laid out like a page from
// a printed family register: surname in display caps, generations marked
// with roman numerals in the left gutter, names in the display font, dates
// in tabular small caps. Connectors are crisp 1px ink hairlines drawn
// orthogonally between generation rows.
//
// All measurement happens with getBoundingClientRect inside a ResizeObserver
// so the lines re-route cleanly on viewport changes.

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
  const earliestYear = family.subjects
    .map((s) => s.birthYear)
    .filter((y): y is number => typeof y === "number")
    .sort((a, b) => a - b)[0];

  return (
    <section className="mx-auto mt-xl w-full max-w-[1200px] px-md sm:px-lg">
      <RegisterHeader
        surname={computedSurname}
        earliest={earliestYear}
        count={family.subjects.length}
      />
      <Register
        generations={generations}
        byGen={byGen}
        family={family}
        memos={memos}
        currentSubjectId={currentSubjectId}
      />
    </section>
  );
}

function RegisterHeader({
  surname,
  earliest,
  count,
}: {
  surname: string;
  earliest?: number;
  count: number;
}) {
  return (
    <header className="rise pb-xl">
      <div className="flex items-baseline justify-between gap-md">
        <p className="type-metadata text-ink-tertiary">The register</p>
        <p className="type-metadata text-ink-tertiary">
          {count} {count === 1 ? "person" : "people"}
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
      <div className="mt-md h-px w-full bg-primary opacity-20" />
    </header>
  );
}

function Register({
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

      // Spouse edges first — a hairline horizontal between same-row partners.
      for (const e of family.tree.filter((x) => x.kind === "spouse")) {
        const a = nodeRefs.current.get(e.fromSubjectId);
        const b = nodeRefs.current.get(e.toSubjectId);
        if (!a || !b) continue;
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        if (Math.abs(aRect.top - bRect.top) > 12) continue; // not in same row
        const left = Math.min(aRect.right, bRect.right) - cRect.left;
        const right = Math.max(aRect.left, bRect.left) - cRect.left;
        if (right - left < 4) continue;
        const y = aRect.top + aRect.height * 0.32 - cRect.top;
        next.push({ kind: "spouse", x1: left, y1: y, x2: right, y2: y });
      }

      // Parent edges — orthogonal: parent center → midpoint → child center.
      for (const e of family.tree.filter((x) => x.kind === "parent")) {
        const top = nodeRefs.current.get(e.fromSubjectId);
        const bot = nodeRefs.current.get(e.toSubjectId);
        if (!top || !bot) continue;
        const tRect = top.getBoundingClientRect();
        const bRect = bot.getBoundingClientRect();
        if (bRect.top - tRect.bottom < 8) continue; // skip same-row pairs
        // Anchor below the portrait, not below the dates — looks like the
        // line "leaves the portrait" rather than dragging from the text.
        const fromX = tRect.left - cRect.left + tRect.width / 2;
        const fromY = tRect.top - cRect.top + 132; // just under the portrait
        const toX = bRect.left - cRect.left + bRect.width / 2;
        const toY = bRect.top - cRect.top + 8;
        next.push({ kind: "parent", x1: fromX, y1: fromY, x2: toX, y2: toY });
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
    <div ref={containerRef} className="relative">
      {size.w > 0 && (
        <svg
          aria-hidden
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="pointer-events-none absolute inset-0"
        >
          {connectors.map((c, i) => (
            <Connector key={i} c={c} />
          ))}
        </svg>
      )}

      <ol className="relative z-10 flex flex-col gap-3xl">
        {generations.map((g, gi) => (
          <li
            key={g}
            className="grid items-start gap-lg rise sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-xl lg:gap-2xl"
            style={{ animationDelay: `${gi * 110}ms` }}
          >
            <div className="hidden border-r border-primary/15 pr-md text-right sm:block">
              <span
                className="block type-numeral text-primary opacity-70"
                style={{
                  fontSize: "clamp(2rem, 2.5vw + 0.5rem, 3rem)",
                  letterSpacing: "0.02em",
                  fontVariationSettings: "'SOFT' 50, 'opsz' 144",
                }}
              >
                {romanNumeral(gi + 1)}
              </span>
              <span className="mt-1 block type-metadata text-ink-tertiary">
                Generation
              </span>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-xl sm:justify-start sm:gap-2xl">
              {byGen[g].map((subject) => (
                <div
                  key={subject.id}
                  ref={(el) => {
                    nodeRefs.current.set(subject.id, el);
                  }}
                >
                  <PersonCard
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
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── connectors ──────────────────────────────────────────────────────────────

type Connector = {
  kind: "parent" | "spouse";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function Connector({ c }: { c: Connector }) {
  if (c.kind === "spouse") {
    return (
      <line
        x1={c.x1}
        y1={c.y1}
        x2={c.x2}
        y2={c.y2}
        stroke="var(--color-primary)"
        strokeOpacity="0.32"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
    );
  }
  // Orthogonal parent → child: down to midpoint, across, down to child.
  const midY = (c.y1 + c.y2) / 2;
  const d = `M ${c.x1} ${c.y1} L ${c.x1} ${midY} L ${c.x2} ${midY} L ${c.x2} ${c.y2}`;
  return (
    <path
      d={d}
      stroke="var(--color-primary)"
      strokeOpacity="0.45"
      strokeWidth="1"
      fill="none"
      strokeLinecap="square"
    />
  );
}

// ─── person card ─────────────────────────────────────────────────────────────

function PersonCard({
  subject,
  isViewer,
  hasNewMemo,
}: {
  subject: Subject;
  isViewer: boolean;
  hasNewMemo: boolean;
}) {
  const isMemorial = subject.status === "deceased";
  return (
    <Link
      href={`/family/profile/${subject.id}`}
      className="group block w-[148px] focus:outline-none"
    >
      <div className="relative transition-transform duration-300 group-hover:-translate-y-1">
        <Portrait
          src={subject.photoUrl}
          alt={subject.displayName}
          memorial={isMemorial}
          highlighted={isViewer}
        />
        {hasNewMemo && (
          <span
            aria-label="New memo waiting"
            className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-tertiary text-[10px] text-on-tertiary ring-2 ring-surface"
          >
            ●
          </span>
        )}
      </div>

      <div className="mt-md text-center">
        <div
          className={`type-tree-name leading-tight ${
            isMemorial ? "italic text-ink-tertiary" : "text-primary"
          }`}
        >
          {subject.displayName}
        </div>
        {subject.fullName && subject.fullName !== subject.displayName && (
          <div
            className="mt-0.5 text-ink-tertiary"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              fontWeight: 400,
            }}
          >
            {subject.fullName}
          </div>
        )}
        <div className="mt-1 type-tree-dates tabular-nums text-ink-tertiary">
          {formatDates(subject)}
        </div>
        {isViewer && (
          <div className="mt-1 type-metadata text-tertiary">You</div>
        )}
      </div>

      <div className="mx-auto mt-2 h-px w-8 origin-center scale-x-0 bg-primary/40 transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}

function Portrait({
  src,
  alt,
  memorial,
  highlighted,
}: {
  src?: string;
  alt: string;
  memorial: boolean;
  highlighted: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = !!src && !errored;
  const dims = { w: 100, h: 124 };
  return (
    <div
      className={`relative mx-auto overflow-hidden bg-surface-elevated ${
        highlighted
          ? "shadow-[0_0_0_1px_var(--color-primary),0_0_0_3px_var(--color-surface),0_0_0_4px_var(--color-tertiary)]"
          : "ring-1 ring-primary/20"
      }`}
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: 4,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={dims.w}
          height={dims.h}
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
            letterSpacing: "0.05em",
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
      {memorial && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-2 h-px bg-primary/40"
        />
      )}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveSurname(familyName: string): string | null {
  const m = familyName.match(/^The (.+) family$/i);
  if (m) return m[1];
  return familyName;
}

function formatDates(s: Subject): string {
  if (s.status === "deceased" && s.birthYear && s.deathYear) {
    return `${s.birthYear} – ${s.deathYear}`;
  }
  if (s.birthYear) return `${s.birthYear} –`;
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
