"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { appendEvents } from "@/lib/storage";
import type { Member, Subject, TreeEdge } from "@/lib/types";
import type { FamilyEvent } from "@/lib/events";
import { v4 as randomId } from "@/lib/uuid";

// "/family/add-member" — append a single new person to the active family.
//
// The onboarding flow only fires once when a family is first created. After
// that, this page is the only way to grow the cast: pick a name, role,
// optional dates, optional parent + spouse links, and we write the
// matching events to IndexedDB. Reducing them on the next load shows the
// new node in the tree.

type Draft = {
  displayName: string;
  fullName: string;
  relationshipLabel: string;
  status: "alive" | "deceased";
  birthYear: string;
  deathYear: string;
  generation: number;
  isMember: boolean;
  parentSubjectIds: string[];
  spouseSubjectId: string;
};

function emptyDraft(generation: number): Draft {
  return {
    displayName: "",
    fullName: "",
    relationshipLabel: "",
    status: "alive",
    birthYear: "",
    deathYear: "",
    generation,
    isMember: true,
    parentSubjectIds: [],
    spouseSubjectId: "",
  };
}

export default function AddMemberPage() {
  const router = useRouter();
  const { family, loading } = useFamily();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !family) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading…</p>
      </main>
    );
  }

  const generations = Array.from(
    new Set(family.subjects.map((s) => s.generation ?? 1)),
  ).sort((a, b) => a - b);
  const maxGen = generations.length ? generations[generations.length - 1] : 1;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function toggleParent(id: string) {
    setDraft((d) => ({
      ...d,
      parentSubjectIds: d.parentSubjectIds.includes(id)
        ? d.parentSubjectIds.filter((p) => p !== id)
        : [...d.parentSubjectIds, id],
    }));
  }

  async function save() {
    setError(null);
    if (!family) return;
    if (!draft.displayName.trim()) {
      setError("Give them a name first.");
      return;
    }
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const subjectId = `subj-${randomId().slice(0, 8)}`;
      const subject: Subject = {
        id: subjectId,
        fullName: draft.fullName.trim() || draft.displayName.trim(),
        displayName: draft.displayName.trim(),
        relationshipLabel: draft.relationshipLabel.trim() || "Family",
        status: draft.status,
        birthYear: draft.birthYear ? Number(draft.birthYear) : undefined,
        deathYear:
          draft.status === "deceased" && draft.deathYear
            ? Number(draft.deathYear)
            : undefined,
        generation: Number(draft.generation),
        createdAt: at,
      };

      const events: FamilyEvent[] = [
        { type: "subject.added", subject, at },
      ];

      if (draft.isMember && draft.status === "alive") {
        const member: Member = {
          subjectId,
          defaultAudience: { kind: "everyone" },
          voiceFirstMode: false,
          createdAt: at,
        };
        events.push({ type: "member.activated", member, at });
      }

      for (const parentId of draft.parentSubjectIds) {
        const edge: TreeEdge = {
          fromSubjectId: parentId,
          toSubjectId: subjectId,
          kind: "parent",
        };
        events.push({ type: "treeEdge.added", edge, at });
      }
      if (draft.spouseSubjectId) {
        const edge: TreeEdge = {
          fromSubjectId: draft.spouseSubjectId,
          toSubjectId: subjectId,
          kind: "spouse",
        };
        events.push({ type: "treeEdge.added", edge, at });
      }

      await appendEvents(family.id, events);
      router.push("/family");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1240px] px-md pb-3xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-primary/15 py-md type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-primary">
          ← family
        </Link>
        <span className="hidden sm:inline">{family.name}</span>
        <span />
      </nav>

      <header
        className="rise mt-2xl grid items-end gap-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-3xl"
        style={{ animationDelay: "120ms" }}
      >
        <div>
          <p className="type-metadata text-ink-tertiary">{family.name}</p>
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
            Add a family member
          </h1>
        </div>
        <p className="type-body text-secondary">
          Add anyone — living or in memory. Connect them to a parent or
          spouse so they show up in the right place on the map. You can
          always edit later by adding more members.
        </p>
      </header>

      <div className="mt-xl h-px w-full bg-primary opacity-15" />

      <section className="mt-2xl grid gap-2xl lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-lg">
          <Field label="Name they go by">
            <input
              className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
              placeholder="e.g. Mom, Aunt Beth, Grandpa Bill"
              value={draft.displayName}
              onChange={(e) => update("displayName", e.target.value)}
            />
          </Field>

          <Field label="Full name (optional)">
            <input
              className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
              placeholder="e.g. Margaret Hartwell"
              value={draft.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </Field>

          <Field label="Relationship">
            <input
              className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
              placeholder="e.g. Mother, Brother, Aunt"
              value={draft.relationshipLabel}
              onChange={(e) => update("relationshipLabel", e.target.value)}
            />
          </Field>

          <div className="grid gap-md sm:grid-cols-2">
            <Field label="Status">
              <div className="flex gap-md">
                <Pill
                  active={draft.status === "alive"}
                  onClick={() => update("status", "alive")}
                >
                  Alive
                </Pill>
                <Pill
                  active={draft.status === "deceased"}
                  onClick={() => update("status", "deceased")}
                >
                  In memory
                </Pill>
              </div>
            </Field>

            <Field label="Generation">
              <select
                className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
                value={draft.generation}
                onChange={(e) => update("generation", Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4].map((g) => (
                  <option key={g} value={g}>
                    Gen {g}
                    {g === 0
                      ? " · grandparents"
                      : g === 1
                        ? " · parents"
                        : g === 2
                          ? " · you / siblings"
                          : g === 3
                            ? " · children"
                            : " · grandchildren"}
                    {g === maxGen ? " (newest)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-md sm:grid-cols-2">
            <Field label="Birth year (optional)">
              <input
                className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
                placeholder="e.g. 1962"
                value={draft.birthYear}
                onChange={(e) =>
                  update("birthYear", e.target.value.replace(/[^0-9]/g, ""))
                }
              />
            </Field>
            {draft.status === "deceased" && (
              <Field label="Year passed">
                <input
                  className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
                  placeholder="e.g. 2014"
                  value={draft.deathYear}
                  onChange={(e) =>
                    update(
                      "deathYear",
                      e.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                />
              </Field>
            )}
          </div>

          {draft.status === "alive" && (
            <Field label="Will they record memos themselves?">
              <div className="flex gap-md">
                <Pill
                  active={draft.isMember}
                  onClick={() => update("isMember", true)}
                >
                  Yes — give them an account
                </Pill>
                <Pill
                  active={!draft.isMember}
                  onClick={() => update("isMember", false)}
                >
                  No — just on the map
                </Pill>
              </div>
            </Field>
          )}
        </div>

        <aside className="grid gap-lg">
          <Field label="Parents (pick zero, one, or two)">
            <div className="flex flex-wrap gap-2">
              {family.subjects
                .filter(
                  (s) => (s.generation ?? 1) < (draft.generation ?? 1),
                )
                .map((s) => (
                  <Pill
                    key={s.id}
                    active={draft.parentSubjectIds.includes(s.id)}
                    onClick={() => toggleParent(s.id)}
                    small
                  >
                    {s.displayName}
                  </Pill>
                ))}
              {family.subjects.filter(
                (s) => (s.generation ?? 1) < (draft.generation ?? 1),
              ).length === 0 && (
                <p className="type-metadata text-ink-tertiary">
                  No older generation yet — pick a higher generation above
                  to enable parent links.
                </p>
              )}
            </div>
          </Field>

          <Field label="Spouse (optional)">
            <select
              className="w-full border-b border-primary/30 bg-transparent py-2 type-body text-primary outline-none focus:border-primary"
              value={draft.spouseSubjectId}
              onChange={(e) => update("spouseSubjectId", e.target.value)}
            >
              <option value="">No spouse on the map</option>
              {family.subjects
                .filter((s) => (s.generation ?? 1) === (draft.generation ?? 1))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
            </select>
          </Field>
        </aside>
      </section>

      {error && (
        <p className="mt-xl rounded-md border border-tertiary/40 bg-tertiary/10 px-lg py-md type-body text-tertiary">
          {error}
        </p>
      )}

      <div className="mt-2xl flex flex-wrap items-center gap-md">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-[56px] rounded-lg bg-primary px-xl py-md type-ui-md text-on-primary shadow-md transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add to the family"}
        </button>
        <Link
          href="/family"
          className="min-h-[56px] inline-flex items-center rounded-lg bg-surface-elevated px-lg py-md type-ui-md text-primary"
        >
          Cancel
        </Link>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block type-metadata text-ink-tertiary">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Pill({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border transition-colors ${small ? "px-3 py-1.5 text-xs" : "px-md py-2 type-ui-sm"} ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-primary/30 bg-transparent text-primary hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}
