// Voice-mode intent classifier. PLAN §5.3.
//
// Two-tier: regex fast-path resolves >90% of utterances in <50ms; Haiku is
// the fallback for anything ambiguous. The fast-path is deliberately lenient —
// elders speak in fragments and the matcher should be forgiving.

import type { Family } from "./types";

export type Intent =
  | { kind: "play-from"; subjectIdOrName: string }
  | { kind: "play-latest" }
  | { kind: "stop" }
  | { kind: "pause" }
  | { kind: "repeat" }
  | { kind: "go-back" }
  | { kind: "send-memo-to"; subjectIdOrName: string }
  | { kind: "audience-restrict"; includeNames: string[]; excludeNames: string[] }
  | { kind: "wrap-up" }
  | { kind: "read-family" }
  | { kind: "search"; queryText: string }
  | { kind: "what-on-profile" }
  | { kind: "unknown" };

export function fastPath(utterance: string, family: Family | null): Intent {
  const u = utterance.toLowerCase().trim();

  if (matches(u, ["stop", "stop it", "stop please"])) return { kind: "stop" };
  if (matches(u, ["pause", "hold on", "wait"])) return { kind: "pause" };
  if (matches(u, ["repeat", "repeat that", "say that again", "again"])) return { kind: "repeat" };
  if (matches(u, ["go back", "back", "previous"])) return { kind: "go-back" };
  if (matches(u, ["i'm done", "im done", "i am done", "wrap up", "that's it", "thats it", "finish"])) return { kind: "wrap-up" };
  if (matches(u, ["read me my family", "read my family", "who's in my family", "whos in my family"])) return { kind: "read-family" };
  if (matches(u, ["what's on my profile", "whats on my profile", "what's new", "whats new"])) return { kind: "what-on-profile" };

  // "play the new one from X" / "play the latest from X"
  const playFrom = u.match(/(?:play (?:the )?(?:new |latest |last )?(?:one |memo )?from |listen to )(.+)/);
  if (playFrom) {
    return { kind: "play-from", subjectIdOrName: playFrom[1].trim() };
  }
  if (matches(u, ["play the new one", "play the latest", "play"])) return { kind: "play-latest" };

  // "send a memo to X" / "record a memo for X"
  const sendTo = u.match(/(?:send (?:a )?memo to |record (?:a )?memo for |memo to )(.+)/);
  if (sendTo) return { kind: "send-memo-to", subjectIdOrName: sendTo[1].trim() };

  // "send this just to X, not Y" — audience restriction
  const audienceJustTo = u.match(/^send this (?:just )?to ([^,]+?)(?:, not (.+))?$/);
  if (audienceJustTo) {
    return {
      kind: "audience-restrict",
      includeNames: splitNames(audienceJustTo[1]),
      excludeNames: audienceJustTo[2] ? splitNames(audienceJustTo[2]) : [],
    };
  }

  // "search for X" / "find X" / "what did X say about Y"
  const search = u.match(/(?:search (?:for )?|find |look for )(.+)/);
  if (search) return { kind: "search", queryText: search[1].trim() };
  const whatDid = u.match(/what did (.+) say (?:about |last |recently)?(.*)/);
  if (whatDid) {
    const sub = whatDid[1].trim();
    const tail = whatDid[2].trim();
    return {
      kind: "search",
      queryText: tail ? `${sub} ${tail}` : sub,
    };
  }

  // Direct name match — "Aanya" alone implies "play the new one from Aanya"
  if (family) {
    for (const s of family.subjects) {
      if (u === s.displayName.toLowerCase() || u === s.fullName.toLowerCase()) {
        return { kind: "play-from", subjectIdOrName: s.displayName };
      }
    }
  }

  return { kind: "unknown" };
}

function matches(u: string, candidates: string[]): boolean {
  return candidates.includes(u);
}

function splitNames(s: string): string[] {
  return s
    .split(/,| and /)
    .map((n) => n.trim())
    .filter(Boolean);
}
