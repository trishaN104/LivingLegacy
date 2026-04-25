"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import type { Subject } from "@/lib/types";

// Profile picker — desktop-first cast page.
//
// Lays out like the inside-cover "cast list" of a printed memoir: title set
// large in the display font, a generous gallery of large square portraits
// underneath, no ornaments. On phone the gallery falls back to a 2-column
// stack; on desktop it spans 3–4 columns with breathing room.

export default function ProfilesPage() {
  const router = useRouter();
  const { family, loading } = useFamily();
  const { setCurrentSubjectId } = useProfile();

  if (loading || !family) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading the family…</p>
      </main>
    );
  }

  const memberSubjects = family.subjects.filter((s) =>
    family.members.some((m) => m.subjectId === s.id),
  );

  const surname = deriveSurname(family.name);

  function pick(subjectId: string) {
    setCurrentSubjectId(subjectId);
    router.push("/family");
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1320px] px-md pb-3xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-primary/15 py-md type-metadata text-ink-tertiary">
        <Link href="/" className="hover:text-primary">
          ← cover
        </Link>
        <span className="hidden sm:inline">{surname}</span>
        <Link href="/family/onboarding" className="hover:text-primary">
          + new family
        </Link>
      </nav>

      <header
        className="rise mt-2xl grid items-end gap-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-3xl"
        style={{ animationDelay: "120ms" }}
      >
        <div>
          <p className="type-metadata text-ink-tertiary">The cast · {surname}</p>
          <h1
            className="mt-md text-primary"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display-xl)",
              fontWeight: 600,
              lineHeight: 0.95,
              letterSpacing: "-0.018em",
              fontVariationSettings: "'SOFT' 50, 'opsz' 144",
            }}
          >
            Whose voice is this?
          </h1>
        </div>
        <p className="type-body text-secondary">
          Pick the family member you are. The interviewer uses this to know
          who&apos;s speaking and who you&apos;re recording for. You can switch
          at any time.
        </p>
      </header>

      <div className="mt-xl h-px w-full bg-primary opacity-15" />

      <section
        className="mt-2xl grid grid-cols-2 gap-x-xl gap-y-2xl sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-2xl lg:gap-y-3xl"
      >
        {memberSubjects.map((s, i) => (
          <CastCard
            key={s.id}
            subject={s}
            onPick={() => pick(s.id)}
            delayMs={200 + i * 60}
          />
        ))}
      </section>
    </main>
  );
}

function CastCard({
  subject,
  onPick,
  delayMs,
}: {
  subject: Subject;
  onPick: () => void;
  delayMs: number;
}) {
  const initials = subject.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onPick}
      className="rise group flex w-full flex-col items-center text-center focus:outline-none"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CastPortrait src={subject.photoUrl} alt={subject.displayName} fallback={initials} />

      <div className="mt-lg w-full px-sm">
        <div
          className="text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 1.4vw + 0.9rem, 2.25rem)",
            fontWeight: 600,
            letterSpacing: "-0.012em",
            lineHeight: 1.1,
          }}
        >
          {subject.displayName}
        </div>

        {subject.fullName && subject.fullName !== subject.displayName && (
          <div
            className="mt-1 text-ink-tertiary"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.8125rem",
              letterSpacing: "0.04em",
            }}
          >
            {subject.fullName}
          </div>
        )}

        <div className="mt-2 type-metadata text-ink-tertiary">
          {subject.relationshipLabel}
        </div>

        <div className="mx-auto mt-md h-px w-10 origin-center scale-x-0 bg-primary/50 transition-transform duration-300 group-hover:scale-x-100" />
      </div>
    </button>
  );
}

function CastPortrait({
  src,
  alt,
  fallback,
}: {
  src?: string;
  alt: string;
  fallback: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = !!src && !errored;
  return (
    <div
      className="relative aspect-[4/5] w-full max-w-[220px] overflow-hidden bg-surface-elevated ring-1 ring-primary/25 transition-transform duration-300 group-hover:-translate-y-1 group-hover:ring-primary/45"
      style={{ borderRadius: 4 }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-surface text-primary"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            opacity: 0.4,
          }}
        >
          {fallback}
        </div>
      )}
    </div>
  );
}

function deriveSurname(familyName: string): string {
  const m = familyName.match(/^The (.+) family$/i);
  if (m) return m[1].toUpperCase();
  return familyName.toUpperCase();
}
