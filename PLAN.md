# PLAN — Kin

Phase 3 deliverable. Implementation plan against `SPEC.md`, with the post-BRAINSTORM decisions baked in. Cut line is aggressive: every item is marked **(D) demo-critical** or **(N) nice-to-have**. The hackathon ships everything (D); (N) only happens if (D) is done and the demo flow runs cleanly twice.

---

## 0. Locked decisions from BRAINSTORM Q&A

These are the spec amendments. Do not relitigate during BUILD.

- **No live cloned voice during recording.** Recorder sees the question as serif text on screen ({voice-input-prompt}) and hears it in a neutral narrator voice ("Kin"). Cloned voices appear only on playback for the recipient.
- **Render-once-and-freeze invariant.** When a memo saves, all question audio is rendered in the recorder's cloned voice and stored as immutable blobs. Voice consent revocation never re-renders existing memos. Comment this at the top of the rendering module.
- **The recorder needs a voice clone too.** Without it, the recipient's playback breaks the "single conversation" illusion. Onboarding voice sample doubles as a freeform first memo: "Tell me your name and one thing you want your family to remember about you."
- **Subject ≠ Member.** A `Subject` is a person in the tree (alive or deceased). A `Member` is a Subject who has activated the app. Cross-filing onto Nani's profile works against a Subject.
- **Family-code-only auth, documented loudly.** Anyone with the six-word code can pick any profile. Frame in onboarding: "Kin works like a family photo album. Anyone who knows your family code can open it." Profile PIN is stretch, not MVP.
- **Per-recorder default audience with per-recipient overrides.** Ma sets a household default; Ma can override "memos to Aanya default to her only."
- **Reply gets a fresh topic, linked as a parent edge.** Inheriting the parent's topic produces nonsense on reply.
- **Append-only event log under IndexedDB.** v2 server sync is a sync layer, not a rewrite. Export per profile (zip) ships in MVP.
- **Local-first claim is honest.** Audio archive is on-device; Whisper + ElevenLabs are external for processing. Say so in the README ethics note.
- **Tree edges**: `parent | child | spouse | sibling | other` + freeform `label`. No relationship-graph editor at the hackathon.
- **Rolling Claude-summarized context for live interviews.** Each Opus turn gets: topic + 150-token running summary + last 2 raw exchanges. Not the full transcript.
- **Listen-back card before save.** Optional — "Want to hear it before sending?" Skippable but always offered.
- **Keyword search MVP, semantic search stretch.**

---

## 1. File tree

```
kin/
  README.md                             ← (D, last)
  SPEC.md                               ← already there
  BRAINSTORM.md                         ← already there
  DESIGN.md                             ← already there
  PLAN.md                               ← this file
  tailwind.tokens.json                  ← already there
  package.json
  tsconfig.json                         ← strict: true
  next.config.ts
  tailwind.config.ts                    ← imports tailwind.tokens.json
  postcss.config.js
  .env.local.example                    ← ANTHROPIC_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY, KIN_DEMO_MODE
  public/
    fonts/
      source-serif-pro/{400,400i,600}.woff2
      public-sans/{500}.woff2
    seed/
      portraits/{ma,pa,aanya,rohan,nani}.jpg
      voice-samples/{ma,pa,aanya,rohan}.wav     ← 3+ min, quiet room (R6)
      demo-memo/                                 ← pre-rendered demo audio (R5)
        ma-asks-aanya.mp3                       ← full 4-min demo flow, recorder-side
        aanya-hears-ma.mp3                      ← same memo rendered in Ma's cloned voice for playback
        questions/{q1,q2,q3,q4}-aanya-voice.mp3 ← individual questions in Aanya's voice
        questions/{q1,q2,q3,q4}-ma-voice.mp3    ← same questions in Ma's voice
    tree/
      trunk.svg                                  ← painted brown trunk
      branches.svg                               ← splaying branches with leaves
      blossoms-corner-{tl,tr,bl,br}.svg          ← cherry-blossom corner ornaments
      leaf-ornament.svg
    paper-grain.svg                              ← 3% noise overlay
  src/
    app/
      layout.tsx                                 ← root, paper grain, font loading
      page.tsx                                   ← / family code entry / onboarding
      globals.css
      family/
        layout.tsx                               ← family-scoped context provider
        page.tsx                                 ← /family (tree home)
        profiles/page.tsx                        ← /family/profiles (Netflix picker)
        profile/[memberId]/page.tsx              ← /family/profile/[memberId]
        category/[slug]/page.tsx                 ← /family/category/[slug]
        record/page.tsx                          ← /family/record (new memo flow)
        record/[memoId]/listen/page.tsx          ← /family/record/[memoId]/listen
        onboarding/page.tsx                      ← /family/onboarding
        onboarding/voice/page.tsx                ← /family/onboarding/voice
      api/
        anthropic/route.ts                       ← server-side proxy for Anthropic SDK
        whisper/route.ts                         ← server-side proxy for OpenAI Whisper
        elevenlabs/route.ts                      ← server-side proxy for ElevenLabs
    components/
      tree/
        FamilyTree.tsx                           ← orchestrator
        TreeIllustration.tsx                    ← painted SVG backdrop
        TreeNode.tsx                            ← sage plate (default)
        TreeNodeAncestral.tsx                   ← blush plate
        TreeNodeMemorial.tsx                    ← faded sage plate
        TreePortraitOval.tsx
        TreeEdge.tsx                            ← short straight foliage segments
        CornerOrnaments.tsx
        TreePageTitle.tsx
        PageTagline.tsx
      memo/
        MemoView.tsx
        VerbatimTranscript.tsx                  ← comment: renders unedited recorder content. do not transform.
        VerbatimPullquote.tsx                   ← same comment
        PlayButtonLarge.tsx
        AudioWaveform.tsx
        ListenBackCard.tsx
      record/
        RecordingFlow.tsx                       ← orchestrates Steps 1-6
        RecipientPicker.tsx
        TopicEntry.tsx
        VoiceInputPrompt.tsx                    ← serif question + neutral TTS
        RecordIndicator.tsx                     ← breathing dot (1.4s in/out)
        AudienceCard.tsx
        OrganizingScreen.tsx
      profile/
        ProfileHeader.tsx
        ProfilePortrait.tsx
        ProfileTabs.tsx                         ← Memos / About them / Tree
        AboutThemFeed.tsx
        MemoCard.tsx
      voice/
        VoiceModeProvider.tsx                   ← context for elder voice-first mode
        AmbientPrompt.tsx                       ← per-screen one-line spoken prompt
        PushToTalkMic.tsx                       ← (no always-on mic — privacy)
      common/
        ButtonPrimary.tsx
        ButtonSecondary.tsx
        ButtonGhost.tsx
        ButtonRecord.tsx
        CategoryTag.tsx
        TopicChip.tsx
        ErrorPanel.tsx                          ← calm serif error state
        PaperGrainOverlay.tsx
    lib/
      types.ts                                  ← all entities (§3)
      privacy.ts                                ← THE ONLY path to memo audio (§4)
      storage.ts                                ← IndexedDB-backed event log (§7)
      events.ts                                 ← append-only event types
      anthropic.ts                              ← single SDK access point
      whisper.ts                                ← STT
      elevenlabs.ts                             ← TTS / clone management
      interviewer.ts                            ← Opus live interviewer (§5.1)
      categorization.ts                         ← Sonnet post-session pass (§5.2)
      intent.ts                                 ← regex fast-path + Haiku fallback (§5.3)
      render.ts                                 ← render-once-freeze pipeline (§6)
      demo.ts                                   ← KIN_DEMO_MODE flag + bypass paths (§9)
      family.ts                                 ← family code gen, member ops
      seed.ts                                   ← demo family seed
      log.ts                                    ← console wrapper (no console.log in committed code)
    hooks/
      useMemoRecorder.ts
      useAudioPlayer.ts
      useVoiceCommand.ts
      useFamily.ts
      useProfile.ts                             ← current profile selection (sticky)
  tests/
    privacy.test.ts                             ← every privacy rule, must pass
    intent.test.ts
    render-freeze.test.ts                       ← assert blob immutability after revoke
    audience-rule.test.ts
```

---

## 2. Route map

| Route | Purpose | Voice prompt on load |
|---|---|---|
| `/` | Family code entry / onboarding chooser | "Welcome to Kin. Enter your family code, or set up a new family." |
| `/family/onboarding` | First-time family setup | "Let's set up your family. Tell me your name." |
| `/family/onboarding/voice` | Voice consent + freeform sample | "Say a few sentences about yourself. This becomes your first memo." |
| `/family/profiles` | Netflix-style profile picker | "Whose voice is this?" |
| `/family` | Family tree home | "This is your family. There are N new memos waiting for you." |
| `/family/profile/[memberId]` | Member profile (Memos / About them / Tree tabs) | "This is Ma's profile. She has N memos for you." |
| `/family/category/[slug]` | All memos in a category | "These are the recipes recorded in your family." |
| `/family/record` | New memo flow | "Who is this memo for?" |
| `/family/record/[memoId]/listen` | Memo playback | "From Ma. Recorded last Tuesday. Should I play it?" |

---

## 3. Data model

```typescript
// lib/types.ts

export type Family = {
  id: string;                       // family code "warm-river-cedar-stone-rose-amber"
  name: string;                     // "The Madhunapantula family"
  createdAt: string;
  subjects: Subject[];              // every person in the tree
  members: Member[];                // subset of subjects who have activated the app
  tree: TreeEdge[];
  defaultAudienceByRecorder: Record<string, AudienceRule>;
};

// A Subject is a person. They may be alive, deceased, or simply not on the app.
// Cross-filing ("Stories about Nani") works against Subject regardless of status.
export type Subject = {
  id: string;
  fullName: string;
  displayName: string;
  relationshipLabel: string;        // "Ma", "Dadu", "Aanya's husband Rohan"
  photoUrl?: string;
  status: "alive" | "deceased";
  birthYear?: number;
  deathYear?: number;               // present iff deceased
  createdAt: string;
};

// A Member is a Subject who can use the app — has a voice clone, default audience,
// can record memos. Deceased Subjects are never Members.
export type Member = {
  subjectId: string;
  voiceCloneId?: string;            // ElevenLabs voice ID, present iff consent granted
  voiceConsentAt?: string;
  voiceRevokedAt?: string;          // if set, future memos use neutral narrator
  defaultAudience: AudienceRule;
  perRecipientAudience?: Record<string, AudienceRule>;  // overrides keyed by recipient subjectId
  voiceFirstMode: boolean;          // "Read everything to me and let me speak"
  createdAt: string;
};

export type TreeEdge = {
  fromSubjectId: string;
  toSubjectId: string;
  kind: "parent" | "child" | "spouse" | "sibling" | "other";
  label?: string;
};

export type Memo = {
  id: string;
  recorderSubjectId: string;
  intendedRecipientSubjectIds: string[];
  audience: AudienceRule;           // load-bearing privacy control
  topic: string;
  audioBlobKey: string;             // IndexedDB key — final stitched recorder-voice blob
  questionAudioBlobKeys: string[];  // per-question rendered audio (recipient-side playback)
  durationSeconds: number;
  createdAt: string;
  transcript: TranscriptBlock[];    // verbatim, lightly cleaned (Sonnet output)
  rawTranscript: string;            // unedited Whisper output
  pullQuotes: string[];
  categories: CategoryTag[];
  aboutSubjectIds: string[];        // cross-filing — Subjects mentioned in this memo
  voiceUsedForQuestions: string;    // recorderSubjectId whose clone rendered the questions
  parentMemoId?: string;            // present iff this memo is a reply
  frozen: true;                     // type-level invariant: memos do not mutate after save
};

export type TranscriptBlock = {
  speaker: "interviewer" | "recorder";
  text: string;
  startMs: number;
  endMs: number;
  chapterTitle?: string;            // first block of each chapter carries the title
};

export type CategoryTag = {
  slug: string;                     // "recipes", "stories-about-{subjectId}"
  label: string;                    // "Recipes", "Stories about Ma"
  source: "ai" | "user";
};

export type AudienceRule =
  | { kind: "everyone" }
  | { kind: "include"; subjectIds: string[] }
  | { kind: "exclude"; subjectIds: string[] };
```

### Append-only event log (Q9 forward-looking design)

```typescript
// lib/events.ts — every state change is an event. Reduces to a Family snapshot.
export type FamilyEvent =
  | { type: "family.created"; familyId: string; name: string; at: string }
  | { type: "subject.added"; subject: Subject; at: string }
  | { type: "subject.deceasedMarked"; subjectId: string; deathYear: number; at: string }
  | { type: "member.activated"; subjectId: string; defaultAudience: AudienceRule; at: string }
  | { type: "member.voiceConsented"; subjectId: string; voiceCloneId: string; at: string }
  | { type: "member.voiceRevoked"; subjectId: string; at: string }
  | { type: "member.defaultAudienceChanged"; subjectId: string; rule: AudienceRule; at: string }
  | { type: "treeEdge.added"; edge: TreeEdge; at: string }
  | { type: "memo.recorded"; memo: Memo; at: string }
  | { type: "memo.audienceChanged"; memoId: string; rule: AudienceRule; at: string }
  | { type: "memo.categoriesEdited"; memoId: string; categories: CategoryTag[]; at: string };
```

The reducer `applyEvent(family, event) → family` is pure. v2 sync is just merging event logs.

---

## 4. Privacy enforcement (§12 hardened)

```typescript
// lib/privacy.ts — single source of truth. No memo audio access bypasses these.

export function canMemberPlayMemo(viewer: Subject, memo: Memo, family: Family): boolean {
  if (viewer.id === memo.recorderSubjectId) return true;       // owner always passes
  switch (memo.audience.kind) {
    case "everyone": return true;
    case "include":  return memo.audience.subjectIds.includes(viewer.id);
    case "exclude":  return !memo.audience.subjectIds.includes(viewer.id);
  }
}

export function memosVisibleTo(viewer: Subject, family: Family, memos: Memo[]): Memo[] {
  return memos.filter(m => canMemberPlayMemo(viewer, m, family));
}

export function canSubjectEditMemoAudience(viewer: Subject, memo: Memo): boolean {
  return viewer.id === memo.recorderSubjectId;
}

// THE ONLY function in the codebase that returns audio. ESLint rule forbids
// importing `audioBlobKey` outside this file.
export async function playMemo(
  viewer: Subject, memo: Memo, family: Family
): Promise<HTMLAudioElement> {
  if (!canMemberPlayMemo(viewer, memo, family)) {
    throw new PrivacyViolationError(memo.id, viewer.id);
  }
  const blob = await loadAudioBlob(memo.audioBlobKey);
  return audioElementFromBlob(blob);
}
```

Tests in `tests/privacy.test.ts`:
- viewer is recorder → always passes
- audience.everyone → all viewers pass
- audience.include → only listed viewers pass
- audience.exclude → all viewers except listed pass
- audience cannot be edited by non-recorder
- `playMemo` throws on unauthorized
- `audioBlobKey` is not exported from any module other than `lib/privacy.ts` and `lib/render.ts` (the only writer)

---

## 5. Anthropic API call inventory

All SDK calls go through `lib/anthropic.ts`. Components never import `@anthropic-ai/sdk` directly. The server-side proxy (`/api/anthropic/route.ts`) keeps the API key off the client.

### 5.1 Live interviewer — `claude-opus-4-7`

Streaming, low latency. One question per turn.

| Field | Value |
|---|---|
| Model | `claude-opus-4-7` |
| Stream | yes |
| System prompt | ~1500 tokens (verbatim from SPEC §11) |
| Per-turn user message | topic (50t) + rolling 150t summary + last 2 exchanges (~300t) ≈ 500t |
| Output | 1 question, ~30 tokens |
| Turns per memo | 6–15 |
| Per-memo total | ~3k input × 10 turns + ~300 output ≈ 30k input / 300 output |
| Budget | $0.05–0.15 per memo at current pricing |

**Input shape per turn:**
```
TOPIC: {memo.topic}
RECIPIENT: {recipientName}, {relationshipLabel}
RECORDER: {recorderName}, {relationshipLabel}
RECIPIENT-CONTEXT: {200-word summary of what this recipient has historically asked about}
RUNNING-SUMMARY: {150-token running summary of the conversation so far}
LAST-EXCHANGES:
[interviewer]: {previous question}
[recorder]: {recorder's last answer}
[interviewer]: {previous question}
[recorder]: {recorder's most recent answer}
```

The 150-token running summary is refreshed every 4 turns by a Haiku call (§5.4) to keep Opus turns cheap.

### 5.2 Post-session organization — `claude-sonnet-4-6`

Single call after wrap-up. Tool use / structured output.

| Field | Value |
|---|---|
| Model | `claude-sonnet-4-6` |
| Stream | no |
| Input | full Whisper raw transcript (1k–5k tokens) + topic + family context (~500t) |
| Output | structured JSON per SPEC §8 (chapters, pullQuotes, categories, aboutSubjectIds, epigraph, cleaned blocks) |
| Output tokens | 500–1500 |
| Tool definition | `organize_memo` with the exact schema from SPEC §8 |
| Latency | 4–10s |

UX: shown as the OrganizingScreen with Claude's voice saying "Organizing what you said about the spaghetti recipe." (Q-spec accurate.)

### 5.3 Voice intent classifier — regex fast-path + `claude-haiku-4-5` fallback

Per Q4 / pushback #2: ≤2.5s to first audio. Fixed intent set:

```typescript
type Intent =
  | { kind: "play-from"; subjectIdOrName: string }
  | { kind: "play-latest" }
  | { kind: "stop" } | { kind: "pause" } | { kind: "repeat" } | { kind: "go-back" }
  | { kind: "send-memo-to"; subjectIdOrName: string }
  | { kind: "audience-restrict"; includeNames: string[]; excludeNames: string[] }
  | { kind: "wrap-up" }
  | { kind: "read-family" }
  | { kind: "search"; queryText: string }
  | { kind: "what-on-profile" }
  | { kind: "unknown" };
```

Pipeline:
1. Push-to-talk records 1–3s clip.
2. Whisper transcribe (~400ms with prompt biasing for member names).
3. Regex fast-path on the transcript (~5ms). Resolves >90% of utterances.
4. If unknown → Haiku call (~150ms) with the intent schema and family member name list.
5. Pre-buffer "thinking" sound (page-turn) if step 4 is reached and total > 800ms.
6. Action triggered.

| Field | Value (Haiku call) |
|---|---|
| Model | `claude-haiku-4-5` |
| Input | utterance + intent schema + member name list ≈ 350t |
| Output | JSON intent ≈ 50t |
| Latency target | <200ms |

### 5.4 Rolling summary refresh — `claude-haiku-4-5`

Triggered every 4 interviewer turns.

| Field | Value |
|---|---|
| Model | `claude-haiku-4-5` |
| Input | previous summary (150t) + 4 new exchanges (~600t) ≈ 750t |
| Output | new 150-token summary |
| Latency | <500ms (runs in background between Opus turns) |

### 5.5 Token budget per demo memo (4-min flow, scripted)

| Call | Tokens (input) | Tokens (output) | Calls |
|---|---|---|---|
| Opus interviewer | ~30k | ~300 | 1 (10 turns) |
| Haiku rolling summary | ~2k | ~600 | 2 |
| Sonnet organization | ~5k | ~1.2k | 1 |
| Whisper STT | (audio min) | — | 1 |
| Total | ~37k input / ~2.1k output | | |

Comfortably <$0.30 per memo, even cheaper with prompt caching on the system prompt.

---

## 6. Audio capture, voice cloning, render-once-freeze

### 6.1 Audio capture (`lib/audio.ts`)

- `MediaRecorder` API, `audio/webm; codecs=opus`, 64 kbps mono.
- Chunked every 30s into separate Blobs to survive crashes.
- On stop: concatenated to single Blob. Stored in IndexedDB under a generated key.
- Permissions checked at first record; calm serif denied state with retry.
- Pre-checks: AudioContext sample rate, mic device label.

### 6.2 Voice cloning (`lib/elevenlabs.ts`)

- During onboarding voice screen: capture 60–90s of speech (push for 3+ min in seed family — R6).
- Send to ElevenLabs `voices/add` → returns `voiceCloneId`.
- Stored on the Member entity.
- Revocation (`member.voiceRevoked`): future memos use the neutral "Kin" narrator voice for question rendering. **Existing memo audio blobs are never re-rendered.**

### 6.3 Render-once-freeze (`lib/render.ts`)

The most load-bearing module. Top of file:

```typescript
// INVARIANT: memo audio blobs are immutable after save. This module is the
// only writer. Voice consent revocation does not re-render existing memos.
// If you find yourself wanting to mutate a Memo's audio, write a new Memo.
```

Pipeline (called once, when the recorder taps Save):

1. Read the recorder's voiceCloneId. If absent, use neutral "Kin" voice and tag the memo with `voiceUsedForQuestions: "kin-narrator"`.
2. For each interviewer turn in the transcript, render the question text via ElevenLabs TTS in the recorder's voice → audio blob → store under `questionAudioBlobKeys[i]`.
3. Stitch: question audio + recorder's answer audio (from the original recording, sliced by transcript timing) → final playback blob → store under `memo.audioBlobKey`.
4. Mark `frozen: true` and write to event log.

The recipient's playback uses `memo.audioBlobKey` directly (single file, single `<audio>` element). No re-rendering anywhere.

---

## 7. Storage strategy

`lib/storage.ts` wraps an IndexedDB DB named `kin/{familyCode}`. Object stores:

| Store | Key | Value |
|---|---|---|
| families | familyId | Family snapshot |
| events | autoIncrement | FamilyEvent (append-only) |
| audioBlobs | audioBlobKey | Blob |

Quota:
- On every save, check `navigator.storage.estimate()`. If usage > 500 MB, surface a calm serif banner: "Your archive is large. Export a profile to keep things fast."
- Export per profile: zip with `{member}/audio/*.webm` + `{member}/transcripts.json` + `{member}/index.html` (offline-readable archive).

---

## 8. Voice-first mode (elder accessibility layer)

Per Q4: ≤2.5s to first audio. Push-to-talk only — no always-on mic.

Per-screen ambient prompt is rendered by `<AmbientPrompt />` inside each route's layout. Loads the route's prompt template, sends to ElevenLabs ("Kin" narrator voice), plays once on mount with a "stop" affordance.

Voice command intents (§5.3) cover the §9 SPEC list. Every primary action route also has a tap path — voice and visual are parallel, not fallback.

`Claude's narrator voice in this layer is never a cloned family member voice.` — enforced in `lib/elevenlabs.ts` by separate `narrate()` and `renderQuestion()` functions. `narrate()` always uses the "Kin" preset.

---

## 9. Demo mode (R5)

`KIN_DEMO_MODE=true` in `.env.local` enables bypass paths:

- For the seed memo "Ma → Aanya, spaghetti recipe":
  - `interviewer.ts` → returns the pre-scripted question sequence from `public/seed/demo-memo/script.json` instead of streaming Opus.
  - `whisper.ts` → returns the pre-cached transcript instead of calling OpenAI.
  - `categorization.ts` → returns the pre-cached Sonnet output.
  - `elevenlabs.ts` → reads from `public/seed/demo-memo/questions/{q}-{voice}.mp3` instead of calling the API.
- All other flows (e.g., a fresh memo recorded mid-demo for fun) still hit live APIs.

Implementation in `lib/demo.ts`:

```typescript
export const DEMO_MEMO_ID = "demo-ma-spaghetti-2026-04-25";
export function isDemoMode(): boolean { return process.env.KIN_DEMO_MODE === "true"; }
export function isDemoMemo(memoId: string): boolean { return memoId === DEMO_MEMO_ID; }
```

Each external-call wrapper checks `isDemoMode() && isDemoMemo(...)` and short-circuits.

The judges-facing demo flow does NOT depend on the network. If wifi dies in the room, the 4-minute scripted flow still runs.

---

## 10. The four hard product decisions (recap from pitch)

These shape every implementation choice. If a decision conflicts with one of these, the decision loses.

1. **The unit is the family, not the user.** One IndexedDB per family code; profiles inside it.
2. **Profile-level privacy, owner-controlled.** `canMemberPlayMemo` is the only path. No admin override anywhere.
3. **AI categorization is automatic and editable.** Sonnet runs at save; user can re-tag in MemoView.
4. **Voice is the entire interface for elders.** `voiceFirstMode: true` on Ma's profile by default in seed.

---

## 11. TODO — ordered by dependency, marked (D) or (N)

User's priority order from BRAINSTORM Q&A: **Q1 locked → demo mode (R5) → record seed audio (R6) → everything else.** Reflected here.

### Pre-code (do this BEFORE writing application code) (D)

- [ ] **PRE.1** Confirm: Source Serif Pro + Public Sans WOFF2 files staged in `public/fonts/`.
- [ ] **PRE.2** **(R6) Record 3+ minutes of clean voice samples** for each seed family member (Ma, Pa, Aanya, Rohan). Quiet room, single mic, single take. This is the audio the demo's emotional payload depends on.
- [ ] **PRE.3** Source seed family portrait photos (oval-friendly composition).
- [ ] **PRE.4** Source painted-tree SVG assets (trunk, branches, leaves, blossoms, corner ornaments).

### Phase A — Scaffold (D)

- [ ] **A.1** Next.js 15 + TS strict + Tailwind v4 init.
- [ ] **A.2** Wire `tailwind.tokens.json` into `tailwind.config.ts`.
- [ ] **A.3** Self-host fonts; reference in `globals.css`.
- [ ] **A.4** `<PaperGrainOverlay />` component on root layout.
- [ ] **A.5** `lib/log.ts` wrapper; ESLint rule banning `console.*` outside it.

### Phase B — Types & privacy (D, must come before UI)

- [ ] **B.1** `lib/types.ts` per §3.
- [ ] **B.2** `lib/privacy.ts` per §4. Top-of-file invariant comment.
- [ ] **B.3** `tests/privacy.test.ts` — every rule passes.
- [ ] **B.4** ESLint custom rule: `audioBlobKey` cannot be referenced outside `lib/privacy.ts` and `lib/render.ts`.

### Phase C — Storage (D)

- [ ] **C.1** `lib/storage.ts` IndexedDB schema + reducer.
- [ ] **C.2** `lib/events.ts` event types + `applyEvent`.
- [ ] **C.3** `lib/family.ts` six-word code generator (BIP39-style word list).
- [ ] **C.4** `lib/seed.ts` seeds the demo family on first load if `KIN_DEMO_MODE=true`.

### Phase D — Anthropic + audio plumbing (D)

- [ ] **D.1** `/api/anthropic/route.ts` proxy. `lib/anthropic.ts` SDK wrapper.
- [ ] **D.2** `/api/whisper/route.ts` proxy. `lib/whisper.ts` STT.
- [ ] **D.3** `/api/elevenlabs/route.ts` proxy. `lib/elevenlabs.ts` with separate `narrate()` and `renderQuestion()` functions.
- [ ] **D.4** `lib/interviewer.ts` Opus streaming with rolling summary.
- [ ] **D.5** `lib/categorization.ts` Sonnet structured output per SPEC §8.
- [ ] **D.6** `lib/intent.ts` regex fast-path + Haiku fallback (full intent set in §5.3).
- [ ] **D.7** `lib/render.ts` render-once-freeze pipeline.

### Phase E — Demo mode FIRST (D, R5)

- [ ] **E.1** `lib/demo.ts` flag + bypass switches in interviewer/whisper/elevenlabs/categorization.
- [ ] **E.2** Stage `public/seed/demo-memo/` with pre-rendered audio + transcript JSON.
- [ ] **E.3** Smoke-test: with `KIN_DEMO_MODE=true` and wifi off, the seed memo flow runs end-to-end.

### Phase F — Tree (D)

- [ ] **F.1** `<TreeIllustration />` painted SVG backdrop (trunk + branches + leaf clusters).
- [ ] **F.2** Generation-stacked layout — `<FamilyTree />` positions nodes top-down, no force-directed.
- [ ] **F.3** `<TreeNode />`, `<TreeNodeAncestral />`, `<TreeNodeMemorial />` plates.
- [ ] **F.4** `<TreePortraitOval />` 96×128 oval frame.
- [ ] **F.5** `<TreeEdge />` short straight foliage segments (parent → child disambiguation).
- [ ] **F.6** `<CornerOrnaments />`, `<TreePageTitle />`, `<PageTagline />`.
- [ ] **F.7** "New" badge on nodes with unplayed memos for the current profile.

### Phase G — Profile picker + profile pages (D)

- [ ] **G.1** `/family/profiles` Netflix-style grid.
- [ ] **G.2** `useProfile` hook — sticky selection per device (localStorage).
- [ ] **G.3** `/family/profile/[memberId]` with Memos / About them / Tree tabs.
- [ ] **G.4** Memo cards filtered through `memosVisibleTo`.
- [ ] **G.5** Cross-filing: when a memo's `aboutSubjectIds` include subject X, the memo appears on X's profile under "Stories about X".

### Phase H — Recording flow (D)

- [ ] **H.1** Step 1 `<RecipientPicker />` portrait grid.
- [ ] **H.2** Step 2 `<TopicEntry />` voice or type.
- [ ] **H.3** Step 4 `<VoiceInputPrompt />` serif question text + neutral narrator TTS (cloned voices NOT used here per Q1).
- [ ] **H.4** `<RecordIndicator />` breathing dot.
- [ ] **H.5** Pause / Wrap-up controls.
- [ ] **H.6** `<ListenBackCard />` between audience and save (Q14).
- [ ] **H.7** Step 5 `<AudienceCard />` with default + per-recipient overrides.
- [ ] **H.8** Step 6 `<OrganizingScreen />` runs Sonnet pass + render-once-freeze.

### Phase I — Memo View (D)

- [ ] **I.1** Large `<PlayButtonLarge />` + waveform above transcript (R7).
- [ ] **I.2** Title + chapters + pullquotes + transcript.
- [ ] **I.3** Three actions: Listen / Download (.zip) / Reply.
- [ ] **I.4** Reply flow: prompt for new topic, link `parentMemoId`.
- [ ] **I.5** Memo audio access: every code path goes through `playMemo()`.

### Phase J — Voice-first mode (D for the demo, but trim ruthlessly)

- [ ] **J.1** `<VoiceModeProvider />` context, `<AmbientPrompt />` per route.
- [ ] **J.2** `<PushToTalkMic />` (no always-on).
- [ ] **J.3** Wire intent classifier to navigation/playback actions.
- [ ] **J.4** Test on Ma's profile (voiceFirstMode: true by default in seed).

### Phase K — Onboarding (N for hackathon — seed bypasses it)

- [ ] **K.1** `/family/onboarding` family creation.
- [ ] **K.2** `/family/onboarding/voice` freeform consent sample (doubles as first memo per Q12).
- [ ] **K.3** Family code share screen.
- [ ] **K.4** Joining via existing code.

### Phase L — Category views (D)

- [ ] **L.1** `/family/category/[slug]`.
- [ ] **L.2** Category rail at the bottom of the tree page.
- [ ] **L.3** Keyword search (transcript string match, MVP).

### Phase M — Polish (D)

- [ ] **M.1** Walk demo §13 manually 5 times. Fix anything that stutters.
- [ ] **M.2** Lighthouse accessibility ≥ 95.
- [ ] **M.3** Calm error states for: mic denied, mic disconnected, tab backgrounded, Whisper timeout, ElevenLabs failure.
- [ ] **M.4** README for judges (§16 in SPEC).
- [ ] **M.5** Verify privacy unit tests still pass with the seed family.

### Phase N — Stretch (N, only if M is done twice)

- [ ] **N.1** Semantic search (embeddings).
- [ ] **N.2** Photo memos (multimodal).
- [ ] **N.3** Translation.
- [ ] **N.4** Memorial mode admin marker.
- [ ] **N.5** Profile PIN gate.

---

## 12. The cut line

If running out of time at hour 6 of 8:

**Keep no matter what (the 10 demo steps in SPEC §13):**
- Phases A, B, C, D.1–D.5, D.7, E (demo mode), F (tree), G (profile picker + profile), H (recording), I (memo view), L.1 (category page).

**Cut without remorse:**
- Phase J voice-first mode beyond a single ambient prompt — drop the intent classifier if needed; demo flows can be tap-driven.
- Phase K onboarding (seed bypasses it).
- Phase L.3 search.
- All of N.

**Never cut:**
- `lib/privacy.ts` and its tests.
- `lib/render.ts` render-once-freeze.
- Demo mode (Phase E).
- The §13 demo flow.

---

## 13. Demo dress-rehearsal checklist

Run twice before judging. Both runs must complete cleanly.

- [ ] App loads with KIN_DEMO_MODE=true on a fresh IndexedDB.
- [ ] Profile picker shows Ma, Pa, Aanya, Rohan (Nani is in tree as deceased Subject, not in picker).
- [ ] Pick Ma. Tree renders with painted backdrop, four members + Nani as ancestral, "New" badge on at least one node.
- [ ] Tap "New memo." Recipient = Aanya. Topic = "I want to tell Aanya the recipe for the spaghetti my mother used to make."
- [ ] Step 4: Question 1 appears as serif text, neutral narrator voice speaks it.
- [ ] Run 3–4 turns. **One MUST be a follow-up generated from a detail in the answer.** This is the proof point.
- [ ] Wrap up. Audience defaults to "just Aanya." Demonstrate changing to "all the kids" (Aanya + Rohan).
- [ ] Listen-back card appears (optional). Skip for the demo.
- [ ] OrganizingScreen → MemoView. Pull quote rendered. Categories: Recipes + Stories about Nani.
- [ ] Switch profile to Aanya. Memo appears on Aanya's "new for you" rail. **Play it. Questions are now in Ma's cloned voice.**
- [ ] Family tree shows the memo cross-filed onto Nani's profile under "Stories about Nani."
- [ ] Closing line: "Every conversation in this family is now permanent."

---

## 14. Outstanding questions for BUILD

Defer until they actually block. Don't relitigate.

1. **Do we need a real onboarding?** If the demo seeds the family, we may never enter `/family/onboarding`. Decision: build it only if (D) for the everyday user matters more than a stretch feature. Current call: skip for hackathon (Phase K = N).
2. **Photo memos as multimodal stretch.** Worth it only if the seed family already has a few photos staged. Defer.
3. **Tailwind v4 status with Next 15.** If integration is rocky, fall back to v3. The token export works either way.
4. **Tree dragging.** SPEC §10 mentions force-directed + drag-to-refine. Cut: top-down generational layout is enough for the demo, and matches the reference image. Stretch: drag-to-refine.

---

End of plan. Moving to BUILD next.
