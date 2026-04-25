// Append-only event log. SPEC §pitch + PLAN §3.
//
// Every state change in a Family is captured as an event. Reducing the events
// in order produces the current Family snapshot. v2 server sync is a merge of
// event logs across devices — not a re-architecture.

import type {
  AudienceRule,
  CategoryTag,
  Family,
  Member,
  Memo,
  Subject,
  TreeEdge,
} from "./types";

export type FamilyEvent =
  | { type: "family.created"; familyId: string; name: string; at: string }
  | { type: "subject.added"; subject: Subject; at: string }
  | { type: "subject.deceasedMarked"; subjectId: string; deathYear: number; at: string }
  | { type: "member.activated"; member: Member; at: string }
  | { type: "member.defaultAudienceChanged"; subjectId: string; rule: AudienceRule; at: string }
  | { type: "member.voiceFirstModeToggled"; subjectId: string; on: boolean; at: string }
  | { type: "treeEdge.added"; edge: TreeEdge; at: string }
  | { type: "memo.recorded"; memo: Memo; at: string }
  | { type: "memo.audienceChanged"; memoId: string; rule: AudienceRule; at: string }
  | { type: "memo.categoriesEdited"; memoId: string; categories: CategoryTag[]; at: string };

export function applyEvent(family: Family, event: FamilyEvent): Family {
  switch (event.type) {
    case "family.created":
      return {
        id: event.familyId,
        name: event.name,
        createdAt: event.at,
        subjects: [],
        members: [],
        tree: [],
        defaultAudienceByRecorder: {},
      };

    case "subject.added":
      if (family.subjects.some((s) => s.id === event.subject.id)) return family;
      return { ...family, subjects: [...family.subjects, event.subject] };

    case "subject.deceasedMarked":
      return {
        ...family,
        subjects: family.subjects.map((s) =>
          s.id === event.subjectId ? { ...s, status: "deceased", deathYear: event.deathYear } : s,
        ),
      };

    case "member.activated":
      if (family.members.some((m) => m.subjectId === event.member.subjectId)) return family;
      return { ...family, members: [...family.members, event.member] };

    case "member.defaultAudienceChanged":
      return {
        ...family,
        members: family.members.map((m) =>
          m.subjectId === event.subjectId ? { ...m, defaultAudience: event.rule } : m,
        ),
      };

    case "member.voiceFirstModeToggled":
      return {
        ...family,
        members: family.members.map((m) =>
          m.subjectId === event.subjectId ? { ...m, voiceFirstMode: event.on } : m,
        ),
      };

    case "treeEdge.added":
      return { ...family, tree: [...family.tree, event.edge] };

    case "memo.recorded":
      // Memos live in their own object store, not on the Family snapshot.
      // The reducer leaves the family alone; storage layer writes the memo.
      return family;

    case "memo.audienceChanged":
    case "memo.categoriesEdited":
      // Same — memos are mutated by the storage layer's event handler, not here.
      return family;
  }
}

export function reduce(events: FamilyEvent[]): Family | null {
  let family: Family | null = null;
  for (const e of events) {
    if (e.type === "family.created") {
      family = applyEvent(emptyFamily(e.familyId, e.name, e.at), e);
    } else if (family) {
      family = applyEvent(family, e);
    }
  }
  return family;
}

function emptyFamily(id: string, name: string, at: string): Family {
  return {
    id,
    name,
    createdAt: at,
    subjects: [],
    members: [],
    tree: [],
    defaultAudienceByRecorder: {},
  };
}
