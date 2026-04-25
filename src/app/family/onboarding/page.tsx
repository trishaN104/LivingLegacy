"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setActiveFamilyId } from "@/hooks/useFamily";
import { appendEvents, saveMemo, getMemo } from "@/lib/storage";
import { generateFamilyCode } from "@/lib/family";
import { isDemoMode, buildDemoMemo, DEMO_MEMO_ID } from "@/lib/demo";
import {
  DEMO_FAMILY_ID,
  DEMO_FAMILY_NAME,
  seedEvents,
} from "@/lib/seed";
import type { Member, Subject, TreeEdge } from "@/lib/types";
import type { FamilyEvent } from "@/lib/events";
import { v4 as randomId } from "@/lib/uuid";
import { useProfile } from "@/hooks/useProfile";

// "/family/onboarding" — set up a new family. Lightweight three-step flow:
//   1. Family name
//   2. Add the people in the tree (at least one alive member is the recorder)
//   3. Generate a family code and write events into a fresh IndexedDB
//
// Also supports "Use the demo family" which resets back to the seeded
// Hartwell family so the user can return to the §13 demo at any time.

type Draft = {
  displayName: string;
  fullName: string;
  relationshipLabel: string;
  status: "alive" | "deceased";
  birthYear: string;
  deathYear: string;
  generation: number;
  isMember: boolean;
};

function emptyDraft(generation = 1): Draft {
  return {
    displayName: "",
    fullName: "",
    relationshipLabel: "",
    status: "alive",
    birthYear: "",
    deathYear: "",
    generation,
    isMember: true,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setCurrentSubjectId } = useProfile();

  const [step, setStep] = useState<"name" | "people" | "review" | "saving">("name");
  const [familyName, setFamilyName] = useState("");
  const [people, setPeople] = useState<Draft[]>([
    { ...emptyDraft(1), relationshipLabel: "Mother" },
    { ...emptyDraft(2), relationshipLabel: "Daughter" },
  ]);
  const [error, setError] = useState<string | null>(null);

  function updatePerson(i: number, patch: Partial<Draft>) {
    setPeople((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }
  function addPerson() {
    setPeople((prev) => [...prev, emptyDraft(2)]);
  }
  function removePerson(i: number) {
    setPeople((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function useDemoFamily() {
    setActiveFamilyId(DEMO_FAMILY_ID);
    if (isDemoMode()) {
      // Make sure the demo family is seeded.
      await appendEvents(DEMO_FAMILY_ID, seedEvents());
      if (!(await getMemo(DEMO_FAMILY_ID, DEMO_MEMO_ID))) {
        await saveMemo(DEMO_FAMILY_ID, buildDemoMemo());
      }
    }
    router.push("/family/profiles");
  }

  async function save() {
    setError(null);

    const cleanedName = familyName.trim();
    if (cleanedName.length < 2) {
      setError("Give the family a name.");
      setStep("name");
      return;
    }

    const cleaned = people
      .map((p) => ({
        ...p,
        displayName: p.displayName.trim(),
        fullName: p.fullName.trim(),
        relationshipLabel: p.relationshipLabel.trim(),
        birthYear: p.birthYear.trim(),
        deathYear: p.deathYear.trim(),
      }))
      .filter((p) => p.displayName.length > 0);

    if (cleaned.length === 0) {
      setError("Add at least one person.");
      setStep("people");
      return;
    }
    if (!cleaned.some((p) => p.isMember && p.status === "alive")) {
      setError(
        "At least one living person should be marked as a family member so they can record memos.",
      );
      setStep("people");
      return;
    }

    setStep("saving");
    try {
      const familyId = generateFamilyCode();
      const at = new Date().toISOString();

      const subjects: Subject[] = cleaned.map((p) => ({
        id: `subj-${randomId()}`,
        fullName: p.fullName || p.displayName,
        displayName: p.displayName,
        relationshipLabel: p.relationshipLabel || "Family",
        photoUrl: undefined,
        status: p.status,
        birthYear: p.birthYear ? Number(p.birthYear) : undefined,
        deathYear:
          p.status === "deceased" && p.deathYear
            ? Number(p.deathYear)
            : undefined,
        generation: p.generation,
        createdAt: at,
      }));

      const members: Member[] = subjects
        .filter((s, i) => cleaned[i].isMember && cleaned[i].status === "alive")
        .map((s) => ({
          subjectId: s.id,
          defaultAudience: { kind: "everyone" },
          voiceFirstMode: false,
          createdAt: at,
        }));

      // Naive parent edges so the visual tree has structure: anyone in
      // generation N becomes a parent of everyone in generation N+1.
      const tree: TreeEdge[] = [];
      const byGen = new Map<number, Subject[]>();
      for (const s of subjects) {
        const g = s.generation ?? 1;
        if (!byGen.has(g)) byGen.set(g, []);
        byGen.get(g)!.push(s);
      }
      const sortedGens = Array.from(byGen.keys()).sort((a, b) => a - b);
      for (let i = 0; i < sortedGens.length - 1; i++) {
        const parents = byGen.get(sortedGens[i])!;
        const children = byGen.get(sortedGens[i + 1])!;
        for (const c of children) {
          for (const p of parents) {
            tree.push({ fromSubjectId: p.id, toSubjectId: c.id, kind: "parent" });
          }
        }
      }

      const events: FamilyEvent[] = [];
      events.push({
        type: "family.created",
        familyId,
        name: cleanedName,
        at,
      });
      for (const s of subjects) events.push({ type: "subject.added", subject: s, at });
      for (const m of members) {
        events.push({ type: "member.activated", member: m, at });
      }
      for (const e of tree) events.push({ type: "treeEdge.added", edge: e, at });

      await appendEvents(familyId, events);

      setActiveFamilyId(familyId);

      const firstMember = members[0];
      if (firstMember) setCurrentSubjectId(firstMember.subjectId);

      router.push("/family/profiles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the family.");
      setStep("review");
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-[1280px] px-md pb-2xl sm:px-xl">
      <nav className="rise flex items-center justify-between gap-md border-b border-divider/60 py-md type-metadata text-ink-tertiary">
        <Link href="/" className="hover:text-foliage-deep">
          ← back to the cover
        </Link>
        <button
          type="button"
          onClick={useDemoFamily}
          className="rounded-full bg-surface-elevated px-4 py-1.5 text-tertiary transition-colors hover:text-accent"
        >
          {isDemoMode() ? `Use the ${DEMO_FAMILY_NAME}` : "Use the seeded family"}
        </button>
      </nav>

      <header className="rise mt-2xl flex flex-col items-baseline gap-md sm:flex-row sm:gap-xl" style={{ animationDelay: "120ms" }}>
        <span className="type-numeral text-tertiary text-[3rem] leading-none">N°</span>
        <div>
          <p className="type-metadata text-blush-deep">A new family</p>
          <h1 className="type-display-l mt-sm text-foliage-deep">
            Plant the tree.
          </h1>
          <p className="type-body mt-md text-secondary reading-width">
            One family lives in this app. Add the people you want to remember
            and the people who will record memos. You can always come back and
            add more.
          </p>
        </div>
      </header>

      {step === "name" && (
        <section className="mt-2xl crossfade">
          <label className="block type-metadata text-ink-tertiary">
            What is this family called?
          </label>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="The Patel family"
            autoFocus
            className="mt-sm w-full rounded-lg border border-divider/60 bg-surface-elevated p-md type-display-m text-primary placeholder:text-ink-tertiary/60 focus:outline-none focus:ring-2 focus:ring-foliage-deep"
          />
          <div className="mt-xl flex justify-end">
            <button
              type="button"
              disabled={familyName.trim().length < 2}
              onClick={() => setStep("people")}
              className="min-h-[56px] rounded-md bg-primary px-xl py-md type-ui-md text-on-primary transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next — add people
            </button>
          </div>
        </section>
      )}

      {step === "people" && (
        <section className="mt-2xl crossfade">
          <p className="type-metadata text-ink-tertiary">
            Generations stack top-down. 0 = ancestors, 1 = parents, 2 =
            children.
          </p>

          <ul className="mt-md flex flex-col gap-md">
            {people.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-divider/40 bg-surface p-md"
              >
                <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
                  <Field
                    label="Display name"
                    value={p.displayName}
                    onChange={(v) => updatePerson(i, { displayName: v })}
                    placeholder="Mom"
                  />
                  <Field
                    label="Full name"
                    value={p.fullName}
                    onChange={(v) => updatePerson(i, { fullName: v })}
                    placeholder="Margaret Hartwell"
                  />
                  <Field
                    label="Relationship"
                    value={p.relationshipLabel}
                    onChange={(v) => updatePerson(i, { relationshipLabel: v })}
                    placeholder="Mother"
                  />
                  <NumberField
                    label="Generation"
                    value={p.generation}
                    onChange={(v) => updatePerson(i, { generation: v })}
                    min={0}
                    max={5}
                  />
                  <Field
                    label="Birth year"
                    value={p.birthYear}
                    onChange={(v) => updatePerson(i, { birthYear: v })}
                    placeholder="1962"
                  />
                  {p.status === "deceased" && (
                    <Field
                      label="Death year"
                      value={p.deathYear}
                      onChange={(v) => updatePerson(i, { deathYear: v })}
                      placeholder="2014"
                    />
                  )}
                  <SelectField
                    label="Status"
                    value={p.status}
                    onChange={(v) =>
                      updatePerson(i, { status: v as "alive" | "deceased" })
                    }
                    options={[
                      { value: "alive", label: "Alive" },
                      { value: "deceased", label: "In memory" },
                    ]}
                  />
                  <SelectField
                    label="Records memos?"
                    value={p.isMember ? "yes" : "no"}
                    onChange={(v) =>
                      updatePerson(i, { isMember: v === "yes" })
                    }
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No (memorial)" },
                    ]}
                  />
                </div>
                <div className="mt-md flex justify-end">
                  <button
                    type="button"
                    onClick={() => removePerson(i)}
                    className="type-ui-sm text-ink-tertiary hover:text-blush-deep"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-md">
            <button
              type="button"
              onClick={addPerson}
              className="rounded-md bg-surface-elevated px-lg py-md type-ui-md text-tertiary hover:bg-surface hover:text-accent"
            >
              + Add another person
            </button>
          </div>

          {error && (
            <p className="mt-md type-body text-blush-deep reading-width">
              {error}
            </p>
          )}

          <div className="mt-xl flex flex-wrap gap-md">
            <button
              type="button"
              onClick={() => setStep("name")}
              className="min-h-[56px] rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep("review")}
              className="min-h-[56px] rounded-md bg-primary px-xl py-md type-ui-md text-on-primary hover:bg-secondary"
            >
              Review
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="mt-2xl crossfade">
          <h2 className="type-display-m text-foliage-deep">{familyName}</h2>
          <ul className="mt-md flex flex-col gap-sm">
            {people
              .filter((p) => p.displayName.trim().length > 0)
              .map((p, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between border-b border-divider/40 pb-sm"
                >
                  <span className="type-body text-primary">
                    <strong>{p.displayName}</strong>
                    {p.fullName && p.fullName !== p.displayName && (
                      <span className="text-secondary"> — {p.fullName}</span>
                    )}
                    <span className="ml-2 text-ink-tertiary">
                      {p.relationshipLabel}
                    </span>
                  </span>
                  <span className="type-metadata text-ink-tertiary">
                    gen {p.generation} ·{" "}
                    {p.status === "deceased" ? "in memory" : "alive"}
                    {p.isMember && p.status === "alive" ? " · records" : ""}
                  </span>
                </li>
              ))}
          </ul>
          {error && (
            <p className="mt-md type-body text-blush-deep reading-width">
              {error}
            </p>
          )}
          <div className="mt-xl flex flex-wrap gap-md">
            <button
              type="button"
              onClick={() => setStep("people")}
              className="min-h-[56px] rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={save}
              className="min-h-[56px] rounded-md bg-foliage-deep px-xl py-md type-ui-md text-on-primary hover:bg-secondary"
            >
              Plant the tree
            </button>
          </div>
        </section>
      )}

      {step === "saving" && (
        <section className="mt-2xl flex flex-col items-center gap-md text-center crossfade">
          <span className="block h-3 w-3 rounded-full bg-foliage-deep breathe" />
          <p className="type-display-m text-foliage-deep">
            Generating your family code…
          </p>
          <p className="type-metadata text-ink-tertiary">
            One IndexedDB per family, on this device.
          </p>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="type-metadata text-ink-tertiary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-divider/60 bg-surface-elevated px-3 py-2 type-body text-primary placeholder:text-ink-tertiary/60 focus:outline-none focus:ring-2 focus:ring-foliage-deep"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="type-metadata text-ink-tertiary">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-divider/60 bg-surface-elevated px-3 py-2 type-body text-primary focus:outline-none focus:ring-2 focus:ring-foliage-deep"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="type-metadata text-ink-tertiary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-divider/60 bg-surface-elevated px-3 py-2 type-body text-primary focus:outline-none focus:ring-2 focus:ring-foliage-deep"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
