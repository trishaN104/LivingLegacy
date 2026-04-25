import { describe, it, expect } from "vitest";
import {
  canMemberPlayMemo,
  canSubjectEditMemoAudience,
  evaluateAudience,
  memosVisibleTo,
  playMemo,
} from "@/lib/privacy";
import {
  PrivacyViolationError,
  type AudienceRule,
  type Family,
  type Memo,
  type Subject,
} from "@/lib/types";

const ma: Subject = subj("ma", "Ma");
const pa: Subject = subj("pa", "Pa");
const aanya: Subject = subj("aanya", "Aanya");
const rohan: Subject = subj("rohan", "Rohan");
const nani: Subject = { ...subj("nani", "Nani"), status: "deceased" };

const family: Family = {
  id: "warm-river-cedar-stone-rose-amber",
  name: "The Madhunapantula family",
  createdAt: now(),
  subjects: [ma, pa, aanya, rohan, nani],
  members: [],
  tree: [],
  defaultAudienceByRecorder: {},
};

const everyoneMemo = makeMemo({ recorder: ma.id, audience: { kind: "everyone" } });
const justAanyaMemo = makeMemo({
  recorder: ma.id,
  audience: { kind: "include", subjectIds: [aanya.id] },
});
const allButRohanMemo = makeMemo({
  recorder: ma.id,
  audience: { kind: "exclude", subjectIds: [rohan.id] },
});

describe("evaluateAudience", () => {
  it("everyone → true for any viewer", () => {
    expect(evaluateAudience({ kind: "everyone" }, aanya.id)).toBe(true);
    expect(evaluateAudience({ kind: "everyone" }, rohan.id)).toBe(true);
  });
  it("include → true only for listed viewers", () => {
    const rule: AudienceRule = { kind: "include", subjectIds: [aanya.id] };
    expect(evaluateAudience(rule, aanya.id)).toBe(true);
    expect(evaluateAudience(rule, rohan.id)).toBe(false);
  });
  it("exclude → true for everyone NOT listed", () => {
    const rule: AudienceRule = { kind: "exclude", subjectIds: [rohan.id] };
    expect(evaluateAudience(rule, aanya.id)).toBe(true);
    expect(evaluateAudience(rule, rohan.id)).toBe(false);
  });
});

describe("canMemberPlayMemo", () => {
  it("recorder always passes their own gate, regardless of audience", () => {
    expect(canMemberPlayMemo(ma, justAanyaMemo, family)).toBe(true);
    const exclusive = makeMemo({
      recorder: ma.id,
      audience: { kind: "exclude", subjectIds: [ma.id] },
    });
    expect(canMemberPlayMemo(ma, exclusive, family)).toBe(true);
  });
  it("everyone audience → all viewers pass", () => {
    expect(canMemberPlayMemo(aanya, everyoneMemo, family)).toBe(true);
    expect(canMemberPlayMemo(rohan, everyoneMemo, family)).toBe(true);
  });
  it("include audience → only listed viewers pass", () => {
    expect(canMemberPlayMemo(aanya, justAanyaMemo, family)).toBe(true);
    expect(canMemberPlayMemo(rohan, justAanyaMemo, family)).toBe(false);
  });
  it("exclude audience → listed viewers blocked, others pass", () => {
    expect(canMemberPlayMemo(aanya, allButRohanMemo, family)).toBe(true);
    expect(canMemberPlayMemo(rohan, allButRohanMemo, family)).toBe(false);
  });
});

describe("memosVisibleTo", () => {
  it("filters by audience rule", () => {
    const visible = memosVisibleTo(rohan, family, [
      everyoneMemo,
      justAanyaMemo,
      allButRohanMemo,
    ]);
    expect(visible.map((m) => m.id)).toEqual([everyoneMemo.id]);
  });
  it("recorder still sees their own restricted memos", () => {
    const visible = memosVisibleTo(ma, family, [justAanyaMemo, allButRohanMemo]);
    expect(visible).toHaveLength(2);
  });
});

describe("canSubjectEditMemoAudience", () => {
  it("only the recorder can edit audience", () => {
    expect(canSubjectEditMemoAudience(ma, justAanyaMemo)).toBe(true);
    expect(canSubjectEditMemoAudience(aanya, justAanyaMemo)).toBe(false);
    expect(canSubjectEditMemoAudience(pa, justAanyaMemo)).toBe(false);
  });
});

describe("playMemo (the only audio path)", () => {
  it("returns the blob when authorized", async () => {
    const fakeBlob = new Blob(["fake-audio"]);
    const loader = async () => fakeBlob;
    const out = await playMemo(aanya, justAanyaMemo, family, loader);
    expect(out).toBe(fakeBlob);
  });
  it("throws PrivacyViolationError when blocked", async () => {
    const loader = async () => new Blob(["should-not-be-loaded"]);
    await expect(playMemo(rohan, justAanyaMemo, family, loader)).rejects.toBeInstanceOf(
      PrivacyViolationError,
    );
  });
  it("never invokes the loader for unauthorized viewers (no blob leak)", async () => {
    let loaderCalled = false;
    const loader = async () => {
      loaderCalled = true;
      return new Blob([]);
    };
    await expect(playMemo(rohan, justAanyaMemo, family, loader)).rejects.toThrow();
    expect(loaderCalled).toBe(false);
  });
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function subj(id: string, name: string): Subject {
  return {
    id,
    fullName: name,
    displayName: name,
    relationshipLabel: name,
    status: "alive",
    createdAt: now(),
  };
}

function now() {
  return "2026-04-25T12:00:00.000Z";
}

function makeMemo(opts: { recorder: string; audience: AudienceRule }): Memo {
  return {
    id: `memo-${Math.random().toString(36).slice(2, 8)}`,
    recorderSubjectId: opts.recorder,
    intendedRecipientSubjectIds: [],
    audience: opts.audience,
    topic: "test topic",
    audioBlobKey: "blob:fake",
    durationSeconds: 60,
    createdAt: now(),
    transcript: [],
    rawTranscript: "",
    pullQuotes: [],
    categories: [],
    aboutSubjectIds: [],
    frozen: true,
  };
}
