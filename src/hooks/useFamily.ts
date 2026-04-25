"use client";

import { useEffect, useState } from "react";
import type { Family } from "@/lib/types";
import { appendEvents, getFamily, saveMemo, getMemo } from "@/lib/storage";
import { DEMO_FAMILY_ID, seedEvents } from "@/lib/seed";
import { isDemoMode, buildDemoMemo, DEMO_MEMO_ID } from "@/lib/demo";
import { log } from "@/lib/log";

const ACTIVE_KEY = "kin:active-family-id";

// Read from localStorage, fall back to DEMO_FAMILY_ID. Safe on SSR.
export function getActiveFamilyId(): string {
  if (typeof window === "undefined") return DEMO_FAMILY_ID;
  try {
    return window.localStorage.getItem(ACTIVE_KEY) ?? DEMO_FAMILY_ID;
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
