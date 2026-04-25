# Living Legacy

> Built for the **2026 Cornell Claude Builders Club Hackathon** — Theme: *Social Impact*
> Focus area: **Creative Flourishing** — Amplify human creativity and help people find meaning.

A shared family voice archive. Elders speak; their stories live. Claude conducts an interview in the recipient's voice on the recorder's side, then renders it back in the recorder's voice on the recipient's side. Every memo is auto-categorized into themes (Recipes, Childhood, Stories about [Person], …) so the archive grows into a browsable family library — searchable by person and by topic, fully operable by voice for elders who can't or won't type.

```
The conversation is the surface.
The archive is what lasts.
Neither one alone justifies the app —
together they're inevitable.
```

---

## The problem

Family stories disappear through out time. There is no friction-free way for a grandmother in Ithaca to leave her spaghetti recipe — in her own voice, in her own words — for a grandchild who is not yet old enough to ask for it. Existing tools require typing, cloud accounts, or a tech-fluent relative standing over your shoulder. Living Legacy requires none of those things.

---

## Demo (60-second quickstart)

```bash
git clone <this repo> living-legacy && cd living-legacy
npm install
cp .env.local.example .env.local   # demo mode is on by default
npm run dev                        # http://localhost:3000
```

Open `http://localhost:3000`, click **Open the family**, pick **Ma**, and walk the seeded demo memo. No API keys needed — the demo runs fully offline against pre-rendered audio assets in `public/seed/demo-memo/`.

---

## Adding API keys (for live recording)

Demo mode short-circuits all external APIs. To record a fresh memo with a live Claude interviewer, Whisper transcription, and cloned voices:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...     # Opus interviewer · Sonnet organizer · Haiku intent
OPENAI_API_KEY=sk-...            # Whisper STT
ELEVENLABS_API_KEY=...           # voice cloning + cloned-voice playback

# Set to false (or remove) to enable live providers:
KIN_DEMO_MODE=true
NEXT_PUBLIC_KIN_DEMO_MODE=true
```

Restart the dev server after editing `.env.local`. The home page shows which keys the server can see; values are never displayed.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict |
| Styling | Tailwind CSS v4 |
| Storage | IndexedDB — one DB per family code, append-only event log |
| AI interviewer | Claude Opus (question generation, conversational follow-up) |
| AI organizer | Claude Sonnet (memo categorization at save time) |
| Intent fallback | Claude Haiku |
| Speech-to-text | OpenAI Whisper |
| Voice synthesis | ElevenLabs voice cloning |
| TTS (navigation) | Web Speech API (SpeechSynthesis) — neutral "Living Legacy" preset only |
| Testing | Vitest — 13 unit tests covering all privacy rules |

---

## Project structure

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

## Core design decisions

1. **The unit is the family, not the user.** One IndexedDB per family code; profiles inside it. No per-user signup. Whoever installs first onboards the family.
2. **Profile-level privacy, owner-controlled.** Every memo is posted to the recorder's profile; the recorder picks who can hear it. `canMemberPlayMemo()` in `src/lib/privacy.ts` is the only path to memo audio. There is no admin override.
3. **AI categorization is automatic and editable.** Claude's Sonnet pass categorizes every memo at save time; users can re-tag but don't have to.
4. **Voice is a first-class interface.** Voice-first mode defaults on for elders and is available to anyone via toggle. The product is for the whole family — not just the people who can type.

---

## Challenges

**Chrome SpeechSynthesis is unreliable.** The Web Speech API's `speak()` call silently drops utterances if the synthesis engine isn't ready. We worked around this by queuing utterances, listening for the `voiceschanged` event before the first call, and retrying with exponential backoff — the current implementation speaks interviewer questions reliably across Chrome, Safari, and Firefox.

**Keeping voice clones ethical.** ElevenLabs can synthesize anything in someone's voice. We restricted clone use to interviewer *questions only* — never declarative statements — and built a hard consent-revocation path. Past memos keep their frozen audio blobs; no new synthesis runs on a revoked voice. The "Living Legacy" navigation voice is always a neutral preset, never a family member's clone.

**Local-first with multi-device families in mind.** IndexedDB keeps everything on-device for the hackathon, but real families share across devices. We designed the storage layer as an append-only event log so that a v2 server sync layer is a merge problem, not a rewrite.

**Voice UX for elders.** Screen-reader patterns don't translate to elder-friendly voice UI. We iterated on prompt phrasing, silence detection thresholds, and auto-advance logic until a non-technical tester could complete a full memo recording without looking at the screen.

---

## Ethics

**Voice clones are family-scoped, question-only, and revocable.**
- A clone can only be used inside its own family account. It cannot be exported or played outside the family.
- Claude renders questions only in cloned voices — never statements.
- Either party can revoke voice consent at any time without destroying existing memos.
- App navigation always uses the neutral "Living Legacy" preset. A family member's voice saying "your battery is low" would be disturbing.

**Verbatim is a feature.** Every component rendering recorder-spoken content carries `// Renders unedited recorder content. Do not transform.` Claude never paraphrases what someone said.

**Honest local-first claim.** Audio is on-device (IndexedDB). Whisper and ElevenLabs process audio during recording and onboarding — those are external services — but we do not retain audio on our own servers. Onboarding states this plainly.

---

## What we'd build next

- **Server-side vault with E2EE + sync.** The append-only event log is designed for this; a v2 server is a sync layer, not a rewrite.
- **Facilitated elder onboarding.** A "set up someone else" mode where a tech-fluent family member configures Ma's profile in person.
- **Prompted gap-filling.** "Ma has never recorded anything about her father — want to ask her?" Gentle nudges toward uncaptured stories.
- **Semantic search.** Embeddings over transcripts; query by phrase or feeling, not just keyword.
- **Photo memos (multimodal).** Attach an old photo; Claude asks the recorder about it.
- **Memorial mode.** When a member passes, their profile becomes read-only and is gently highlighted in the family tree.
- **Translation.** Interview in the recorder's first language; deliver the transcript in the recipient's preferred language.

---

## Links

- **Devpost:** https://2026-claude-hackathon.devpost.com/
- **Claude API docs:** https://platform.claude.com/docs/en/home
- **Cornell Claude Builders Club:** https://cornellclaude.club/
