"use client";

import { useEffect, useState } from "react";
import type { Family } from "@/lib/types";
import { appendEvents, getFamily, saveMemo, getMemo } from "@/lib/storage";
import { DEMO_FAMILY_ID, seedEvents } from "@/lib/seed";
import { isDemoMode, buildDemoMemo, DEMO_MEMO_ID } from "@/lib/demo";
import { log } from "@/lib/log";

const ACTIVE_KEY = "kin:active-family-id";

// IDs of previous demo seed casts. When the seeded cast changes (renamed
// members, new tree structure), the DEMO_FAMILY_ID is bumped so a fresh
// seed lands in IndexedDB — but localStorage may still be pinned to the
// old id. We map any of these to the current DEMO_FAMILY_ID. We never
// silently rewrite hand-typed family codes.
const PREVIOUS_DEMO_FAMILY_IDS = new Set([
  "warm-river-cedar-stone-rose-amber", // pre-2026-04 cast (Madhunapantula)
]);

// Read from localStorage, fall back to DEMO_FAMILY_ID. Safe on SSR.
export function getActiveFamilyId(): string {
  if (typeof window === "undefined") return DEMO_FAMILY_ID;
  try {
    const stored = window.localStorage.getItem(ACTIVE_KEY);
    if (!stored) return DEMO_FAMILY_ID;
    if (PREVIOUS_DEMO_FAMILY_IDS.has(stored)) {
      window.localStorage.setItem(ACTIVE_KEY, DEMO_FAMILY_ID);
      return DEMO_FAMILY_ID;
    }
    return stored;
  } catch {
    return DEMO_FAMILY_ID;
  }
}

export function setActiveFamilyId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

// If `familyId` is omitted, the hook resolves the active family from
// localStorage. Demo seeding only runs for the seeded demo family.
export function useFamily(familyId?: string): {
  family: Family | null;
  loading: boolean;
} {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = familyId ?? getActiveFamilyId();
      try {
        let snapshot = await getFamily(id);
        if (!snapshot && isDemoMode() && id === DEMO_FAMILY_ID) {
          snapshot = await appendEvents(id, seedEvents());
          if (!(await getMemo(id, DEMO_MEMO_ID))) {
            await saveMemo(id, buildDemoMemo());
          }
        }
        if (!cancelled) setFamily(snapshot);
      } catch (err) {
        log.error("useFamily", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  return { family, loading };
}
