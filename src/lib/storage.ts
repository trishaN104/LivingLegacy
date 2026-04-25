// IndexedDB-backed persistence for Kin. PLAN §7.
//
// One DB per family, named `kin-{familyId}`. Object stores:
//   - meta:        single record { snapshot: Family }
//   - events:      append-only log keyed by autoIncrement
//   - memos:       Memo records keyed by memoId
//   - audioBlobs:  Blob payloads keyed by audioBlobKey
//
// All client-side. The storage layer is the only thing in the codebase besides
// `lib/render.ts` (memo-creation pipeline) that touches `audioBlobKey` directly.

"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Family, Memo } from "./types";
import type { FamilyEvent } from "./events";
import { applyEvent } from "./events";
import { log } from "./log";

const DB_VERSION = 1;

interface KinSchema {
  meta: { key: "snapshot"; value: { snapshot: Family } };
  events: { key: number; value: FamilyEvent };
  memos: { key: string; value: Memo };
  audioBlobs: { key: string; value: Blob };
}

function dbName(familyId: string): string {
  return `kin-${familyId}`;
}

async function openFamilyDb(familyId: string): Promise<IDBPDatabase<KinSchema>> {
  return openDB<KinSchema>(dbName(familyId), DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { autoIncrement: true });
      if (!db.objectStoreNames.contains("memos")) db.createObjectStore("memos");
      if (!db.objectStoreNames.contains("audioBlobs")) db.createObjectStore("audioBlobs");
    },
  });
}

// ─── public API ──────────────────────────────────────────────────────────────

export async function getFamily(familyId: string): Promise<Family | null> {
  const db = await openFamilyDb(familyId);
  const meta = await db.get("meta", "snapshot");
  return meta?.snapshot ?? null;
}

export async function listEvents(familyId: string): Promise<FamilyEvent[]> {
  const db = await openFamilyDb(familyId);
  return db.getAll("events");
}

export async function appendEvent(
  familyId: string,
  event: FamilyEvent,
): Promise<Family> {
  const db = await openFamilyDb(familyId);

  const tx = db.transaction(["events", "meta"], "readwrite");
  await tx.objectStore("events").add(event);

  const metaStore = tx.objectStore("meta");
  const current = await metaStore.get("snapshot");
  let next: Family;
  if (!current) {
    if (event.type !== "family.created") {
      throw new Error("first event for a family must be family.created");
    }
    next = applyEvent(emptySnapshot(event.familyId, event.name, event.at), event);
  } else {
    next = applyEvent(current.snapshot, event);
  }
  await metaStore.put({ snapshot: next }, "snapshot");
  await tx.done;
  return next;
}

export async function appendEvents(
  familyId: string,
  events: FamilyEvent[],
): Promise<Family> {
  let snapshot: Family | null = null;
  for (const e of events) {
    snapshot = await appendEvent(familyId, e);
  }
  if (!snapshot) throw new Error("appendEvents called with empty list");
  return snapshot;
}

export async function saveMemo(familyId: string, memo: Memo): Promise<void> {
  const db = await openFamilyDb(familyId);
  await db.put("memos", memo, memo.id);
}

export async function getMemo(familyId: string, memoId: string): Promise<Memo | null> {
  const db = await openFamilyDb(familyId);
  return (await db.get("memos", memoId)) ?? null;
}

export async function listMemos(familyId: string): Promise<Memo[]> {
  const db = await openFamilyDb(familyId);
  return db.getAll("memos");
}

export async function putAudioBlob(familyId: string, key: string, blob: Blob): Promise<void> {
  const db = await openFamilyDb(familyId);
  await db.put("audioBlobs", blob, key);
}

export async function getAudioBlob(familyId: string, key: string): Promise<Blob> {
  const db = await openFamilyDb(familyId);
  const blob = await db.get("audioBlobs", key);
  if (!blob) throw new Error(`audio blob not found: ${key}`);
  return blob;
}

export async function familyExists(familyId: string): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  return new Promise((resolve) => {
    const req = indexedDB.open(dbName(familyId));
    let existed = true;
    req.onupgradeneeded = () => {
      existed = false;
    };
    req.onsuccess = () => {
      req.result.close();
      if (!existed) {
        indexedDB.deleteDatabase(dbName(familyId));
      }
      resolve(existed);
    };
    req.onerror = () => resolve(false);
  });
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch (err) {
    log.warn("storage", "estimate failed", err);
    return null;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function emptySnapshot(id: string, name: string, at: string): Family {
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
