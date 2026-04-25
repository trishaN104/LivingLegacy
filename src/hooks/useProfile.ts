"use client";

import { useEffect, useState, useCallback } from "react";

const KEY = "kin:current-profile-subject-id";

// Sticky profile selection per device (Netflix-style). Stored in localStorage.
export function useProfile(): {
  currentSubjectId: string | null;
  setCurrentSubjectId: (id: string | null) => void;
} {
  const [currentSubjectId, setCurrentSubjectIdState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v) setCurrentSubjectIdState(v);
    } catch {
      // ignore
    }
  }, []);

  const setCurrentSubjectId = useCallback((id: string | null) => {
    setCurrentSubjectIdState(id);
    try {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, []);

  return { currentSubjectId, setCurrentSubjectId };
}
