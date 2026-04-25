// Demo seed family. PLAN §13 — the cast that maps onto the §13 ten-step demo.
//
// One ancestral row (Nani — deceased), two parents (Ma, Pa), two children
// (Aanya, Rohan). The family code is fixed in demo mode so the URL is stable
// across reloads.

import type { Family, Member, Subject, TreeEdge } from "./types";
import type { FamilyEvent } from "./events";

export const DEMO_FAMILY_ID = "warm-river-cedar-stone-rose-amber";
export const DEMO_FAMILY_NAME = "The Madhunapantula family";

export const SEED_SUBJECT_IDS = {
  nani: "subj-nani",
  ma: "subj-ma",
  pa: "subj-pa",
  aanya: "subj-aanya",
  rohan: "subj-rohan",
} as const;

const ts = "2026-04-25T11:00:00.000Z";

const subjects: Subject[] = [
  {
    id: SEED_SUBJECT_IDS.nani,
    fullName: "Lakshmi Madhunapantula",
    displayName: "Nani",
    relationshipLabel: "Ma's mother (Nani)",
    photoUrl: "/seed/portraits/nani.jpg",
    status: "deceased",
    birthYear: 1932,
    deathYear: 2014,
    generation: 0,
    createdAt: ts,
  },
  {
    id: SEED_SUBJECT_IDS.ma,
    fullName: "Sudha Madhunapantula",
    displayName: "Ma",
    relationshipLabel: "Mother",
    photoUrl: "/seed/portraits/ma.jpg",
    status: "alive",
    birthYear: 1962,
    generation: 1,
    createdAt: ts,
  },
  {
    id: SEED_SUBJECT_IDS.pa,
    fullName: "Ravi Madhunapantula",
    displayName: "Pa",
    relationshipLabel: "Father",
    photoUrl: "/seed/portraits/pa.jpg",
    status: "alive",
    birthYear: 1958,
    generation: 1,
    createdAt: ts,
  },
  {
    id: SEED_SUBJECT_IDS.aanya,
    fullName: "Aanya Madhunapantula",
    displayName: "Aanya",
    relationshipLabel: "Daughter",
    photoUrl: "/seed/portraits/aanya.jpg",
    status: "alive",
    birthYear: 1995,
    generation: 2,
    createdAt: ts,
  },
  {
    id: SEED_SUBJECT_IDS.rohan,
    fullName: "Rohan Madhunapantula",
    displayName: "Rohan",
    relationshipLabel: "Son",
    photoUrl: "/seed/portraits/rohan.jpg",
    status: "alive",
    birthYear: 1998,
    generation: 2,
    createdAt: ts,
  },
];

const members: Member[] = [
  member(SEED_SUBJECT_IDS.ma, { voiceFirst: true }), // SPEC pitch: voice-first defaults on for elders, Ma is the demo's spoken-interface user
  member(SEED_SUBJECT_IDS.pa),
  member(SEED_SUBJECT_IDS.aanya),
  member(SEED_SUBJECT_IDS.rohan),
];

const tree: TreeEdge[] = [
  { fromSubjectId: SEED_SUBJECT_IDS.nani, toSubjectId: SEED_SUBJECT_IDS.ma, kind: "parent" },
  { fromSubjectId: SEED_SUBJECT_IDS.ma, toSubjectId: SEED_SUBJECT_IDS.pa, kind: "spouse" },
  { fromSubjectId: SEED_SUBJECT_IDS.ma, toSubjectId: SEED_SUBJECT_IDS.aanya, kind: "parent" },
  { fromSubjectId: SEED_SUBJECT_IDS.pa, toSubjectId: SEED_SUBJECT_IDS.aanya, kind: "parent" },
  { fromSubjectId: SEED_SUBJECT_IDS.ma, toSubjectId: SEED_SUBJECT_IDS.rohan, kind: "parent" },
  { fromSubjectId: SEED_SUBJECT_IDS.pa, toSubjectId: SEED_SUBJECT_IDS.rohan, kind: "parent" },
  { fromSubjectId: SEED_SUBJECT_IDS.aanya, toSubjectId: SEED_SUBJECT_IDS.rohan, kind: "sibling" },
];

export function seedEvents(): FamilyEvent[] {
  const events: FamilyEvent[] = [];
  events.push({ type: "family.created", familyId: DEMO_FAMILY_ID, name: DEMO_FAMILY_NAME, at: ts });
  for (const s of subjects) events.push({ type: "subject.added", subject: s, at: ts });
  for (const m of members) {
    events.push({ type: "member.activated", member: m, at: ts });
    events.push({
      type: "member.voiceConsented",
      subjectId: m.subjectId,
      voiceCloneId: `seed-clone-${m.subjectId}`,
      at: ts,
    });
  }
  for (const e of tree) events.push({ type: "treeEdge.added", edge: e, at: ts });
  return events;
}

export function seedFamilySnapshot(): Family {
  return {
    id: DEMO_FAMILY_ID,
    name: DEMO_FAMILY_NAME,
    createdAt: ts,
    subjects,
    members: members.map((m) => ({
      ...m,
      voiceCloneId: `seed-clone-${m.subjectId}`,
      voiceConsentAt: ts,
    })),
    tree,
    defaultAudienceByRecorder: {
      [SEED_SUBJECT_IDS.ma]: { kind: "include", subjectIds: [SEED_SUBJECT_IDS.aanya, SEED_SUBJECT_IDS.rohan] },
    },
  };
}

function member(subjectId: string, opts: { voiceFirst?: boolean } = {}): Member {
  return {
    subjectId,
    defaultAudience: { kind: "everyone" },
    voiceFirstMode: !!opts.voiceFirst,
    createdAt: ts,
  };
}
