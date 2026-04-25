"use client";

import { useRouter } from "next/navigation";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { TreePortraitOval } from "@/components/tree/TreePortraitOval";

// Netflix-style profile picker. Members only — deceased subjects without app
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
    <main className="relative z-10 mx-auto max-w-4xl px-md py-2xl">
      <header className="text-center">
        <p className="type-metadata text-blush-deep">{family.name}</p>
        <h1 className="type-display-l mt-2 text-foliage-deep">Whose voice is this?</h1>
      </header>

      <div className="mt-2xl flex flex-wrap items-start justify-center gap-xl">
        {memberSubjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            className="group flex flex-col items-center gap-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foliage-deep"
          >
            <TreePortraitOval src={s.photoUrl} alt={s.displayName} />
            <div className="text-center">
              <div className="type-display-m text-foliage-deep group-hover:text-primary">
                {s.displayName}
              </div>
              <div className="type-metadata text-ink-tertiary">
                {s.relationshipLabel}
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
