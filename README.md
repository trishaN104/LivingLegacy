# Kin

A shared family voice archive. Each family member gets a profile inside one shared account; Claude conducts an interview in the recipient's voice on the recorder's end and renders it back in the recorder's voice on the recipient's end. Every memo is auto-categorized into themes (Recipes, Childhood, Stories about [Person], …) so the archive becomes browsable by person and by theme. The whole app is operable by voice for elders.

```
The communication is the surface.
The archive is the long tail.
Neither one alone justifies the app —
together they're inevitable.
```

---

## 60-second quickstart

```bash
git clone <this repo> kin && cd kin
npm install
cp .env.local.example .env.local      # demo mode is enabled by default
npm run dev                           # http://localhost:3000
```

Open `http://localhost:3000`, click **Open a family**, pick **Ma**, and walk the §13 demo.

---

## Required env vars

```bash
NEXT_PUBLIC_KIN_DEMO_MODE=true        # short-circuit external APIs for the seeded demo memo
KIN_DEMO_MODE=true

# Optional — needed only for fresh (non-demo) memos:
ANTHROPIC_API_KEY=                    # Opus interviewer, Sonnet organizer, Haiku intent fallback
OPENAI_API_KEY=                       # Whisper STT
ELEVENLABS_API_KEY=                   # voice cloning + cloned-voice playback
```

The demo runs **fully offline**: no Anthropic, OpenAI, or ElevenLabs calls are made for the seeded `Ma → Aanya, spaghetti recipe` memo. To experience the live interviewer / live STT / cloned voices on a memo you record yourself, set the three keys above and record a fresh memo.

Voice clones for the seed family are referenced by ID (`seed-clone-{subjectId}`) — they don't exist on ElevenLabs by default. The demo memo's audio is served as static assets under `public/seed/demo-memo/` (you supply real recordings; placeholder silence is returned otherwise).

---

## The four hard product decisions

These shape every implementation choice. They are non-negotiable.

1. **The unit is the family, not the user.** One IndexedDB per family code; profiles inside it. There's no per-user signup. Whoever installs first onboards the family.
2. **Profile-level privacy, owner-controlled.** Every memo is posted to the recorder's profile; the recorder picks who can hear it. `canMemberPlayMemo()` is the only path to memo audio in the codebase. There is no admin override.
3. **AI categorization is automatic and editable.** Claude's Sonnet pass categorizes every memo at save time; the user can re-tag, but doesn't have to.
4. **Voice is one of two equal interfaces.** Voice-first mode defaults on for elders and is available to anyone via toggle; the visual interface is fully equivalent for everyone else. The product is for the whole family — not just the grandmother who can't type.

---

## Architecture

- **Next.js 16 / App Router**, TypeScript strict, Tailwind v4.
- **IndexedDB** (one DB per family code) with an **append-only event log**. Reducing events produces a `Family` snapshot. v2 server sync is a merge of event logs across devices — not a re-architecture.
- **Privacy gate** in `src/lib/privacy.ts` is the single path to `memo.audioBlobKey`. Direct reads anywhere else are bugs. 13 unit tests cover the rules.
- **Render-once-and-freeze** in `src/lib/render.ts`: when a memo saves, the recorder's cloned voice renders the question audio; the blobs are stored immutably. Voice consent revocation never re-renders existing memos.
- **Two color registers**, strictly separated (see `DESIGN.md`):
  - **Archival** (sage / foliage / bark / blush-plate) — only on the family-tree page and its ornaments.
  - **Interaction** (deep ink / dusty rose) — only on buttons, chips, the recording flow.
- **Family tree** is a **literal hand-painted illustration**, not a graph. Inline SVG paints the trunk, branches, leaves, and blossom corners; member portraits sit as oval frames along the painted branches. Generations stack top-down; ancestors get a blush plate, the rest get sage.

```
src/
  app/                    routes (App Router)
    api/                  Anthropic / Whisper / ElevenLabs server proxies
    family/               family-scoped routes
  components/
    tree/                 FamilyTree, TreeIllustration, TreeNode, ornaments
    record/               RecordingFlow + steps
    memo/                 PlayButtonLarge, VerbatimTranscript, VerbatimPullquote
    profile/              MemoCard
    common/               PaperGrainOverlay
  hooks/                  useFamily, useProfile, useMediaRecorder
  lib/                    types, privacy, storage, events, family code,
                          anthropic, whisper, elevenlabs, intent, render,
                          demo, seed, audio-loader, log
tests/
  privacy.test.ts         13 unit tests covering every privacy rule
public/
  seed/                   portraits + voice samples + demo-memo audio
```

---

## What we'd build next

Priority order, drawn from `PLAN.md` §11 Phase N and `BRAINSTORM.md`:

- **Server-side family vault with end-to-end encryption + sync.** Local-first works for hackathon; real families on five devices in three countries need sync and E2EE. The append-only event log is designed for this — a v2 server is a sync layer, not a rewrite.
- **Facilitated onboarding for elders.** A "set up someone else" mode where a tech-fluent family member configures Ma's profile in person and verifies she can navigate by voice alone before walking out.
- **Prompted gap-filling.** "Ma has never recorded anything about her father — would you like to ask her?" Surfaces gaps in coverage as gentle nudges to whichever family member is best placed to ask.
- **Semantic search across the archive.** Embeddings pipeline over transcripts; query by phrase or feeling, not just keyword.
- **Photo memos (multimodal).** Attach an old photo to the topic; Claude asks the recorder about it.
- **Memorial mode admin marker.** When a member passes, their profile becomes read-only and is highlighted gently in the tree.
- **Translation.** Interview in the recorder's first language, deliver the transcript in the recipient's preferred language.

---

## Ethics

**Voice clones are family-scoped, question-only, revocable.**

- A family member's voice clone can only be used inside their own family. It cannot be exported, cannot be heard outside the family account, and cannot be played to anyone other than the person recording the memo.
- Claude renders **questions only** in cloned voices. Never statements. The cloned voice is never used to put declarative words in someone's mouth.
- Either family member can revoke voice consent at any time. Past memos remain playable as their frozen audio blobs; no new memos are generated using their voice.
- The narrator voice for app navigation is always a single neutral preset ("Kin") — never a cloned family member voice. A member's voice telling you "your battery is low" would be horrifying.

**Verbatim is a feature.** Every component that renders recorder-spoken content carries the comment `// Renders unedited recorder content. Do not transform.` Claude never paraphrases what someone said.

**Honest local-first claim.** The audio archive is on-device (IndexedDB). Audio is processed by OpenAI Whisper for transcription and ElevenLabs for voice synthesis during recording and onboarding — those are external services. We do not retain your audio on our servers. The README and onboarding both say this plainly.

**Family-code-only access.** Anyone in the household with the iPad on the kitchen counter can pick any profile and play whatever that profile is allowed to play. This mirrors how families actually share devices and is explicitly framed in onboarding: "Kin works like a family photo album. Anyone who knows your family code can open it." Profile PIN is a v2 hardening, not a v1 feature.
