"use client";

import { useEffect, useState } from "react";
import type { Family } from "@/lib/types";
import { appendEvents, getFamily, saveMemo, getMemo } from "@/lib/storage";
import { DEMO_FAMILY_ID, seedEvents } from "@/lib/seed";
import { isDemoMode, buildDemoMemo, DEMO_MEMO_ID } from "@/lib/demo";
import { log } from "@/lib/log";

export function useFamily(familyId: string = DEMO_FAMILY_ID): {
  family: Family | null;
  loading: boolean;
} {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let snapshot = await getFamily(familyId);
        if (!snapshot && isDemoMode() && familyId === DEMO_FAMILY_ID) {
          snapshot = await appendEvents(familyId, seedEvents());
          // Seed the demo memo too so /family shows the "New" badge.
          if (!(await getMemo(familyId, DEMO_MEMO_ID))) {
            await saveMemo(familyId, buildDemoMemo());
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
