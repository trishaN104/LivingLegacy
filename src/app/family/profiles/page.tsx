"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { TreePortraitOval } from "@/components/tree/TreePortraitOval";

// Editorial profile picker. Members only — deceased subjects without app
// access aren't picker options. Selection is sticky per device.
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

  function pick(subjectId: string) {
    setCurrentSubjectId(subjectId);
    router.push("/family");
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1280px] px-md pb-2xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-divider/60 py-md type-metadata text-ink-tertiary">
        <Link href="/" className="hover:text-foliage-deep">← cover</Link>
        <span className="hidden sm:inline">{family.name}</span>
        <Link
          href="/family/onboarding"
          className="hover:text-foliage-deep"
        >
          + new family
        </Link>
      </nav>

      <header className="rise mt-2xl text-center" style={{ animationDelay: "120ms" }}>
        <p className="type-metadata text-blush-deep">{family.name}</p>
        <h1 className="type-display-l mt-sm text-foliage-deep">
          Whose voice is this?
        </h1>
        <p className="type-body mt-md text-secondary reading-width mx-auto">
          Pick the family member you are. The interviewer will use this to know
          who&apos;s speaking and who you&apos;re recording for.
        </p>
        <div className="mx-auto mt-lg flex items-center justify-center gap-md">
          <span aria-hidden className="block h-px w-20 bg-divider" />
          <span aria-hidden className="text-blush-deep">❀</span>
          <span aria-hidden className="block h-px w-20 bg-divider" />
        </div>
      </header>

      <section className="mt-2xl grid grid-cols-2 gap-xl sm:grid-cols-3 sm:gap-2xl lg:grid-cols-4 lg:gap-2xl">
        {memberSubjects.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            className="rise group flex flex-col items-center gap-md rounded-xl px-md py-lg text-center transition-all hover:-translate-y-1 hover:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-foliage-deep"
            style={{ animationDelay: `${200 + i * 70}ms` }}
          >
            <TreePortraitOval src={s.photoUrl} alt={s.displayName} />
            <div>
              <div className="type-display-m text-foliage-deep group-hover:text-primary">
                {s.displayName}
              </div>
              <div className="type-metadata mt-1 text-ink-tertiary">
                {s.relationshipLabel}
              </div>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
}
