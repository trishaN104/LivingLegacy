# Kin

## Part 1 — Product Pitch

### One-line description

A shared family voice archive where Claude interviews each family member in the voice of whoever they're talking to, so families spread across the world stay in real conversation — and end up with a permanent, organized audio biography of every person in the family without anyone trying.

### The thesis

Most family communication across distance is shallow ("hi, all good, bye") because the structure of a real conversation — questions, follow-ups, the other person's curiosity — gets stripped out the moment you switch from a call to a recording. Claude can put that structure back in. And when it does, two things happen at once: families talk to each other more honestly, and they accidentally build a permanent archive of who everyone in the family is.

Kin is one product that does both jobs. The communication is the surface. The archive is the long tail. Neither one alone justifies the app — together they're inevitable.

### How it works

A family creates **one shared account** and lays out a **family tree** inside it. Every family member has a profile — like Netflix profiles inside one household subscription — with their name, relationship, photo, and voice sample. Anyone in the family can see the tree. Anyone in the family can open anyone's profile. But what they can listen to inside that profile depends on what its owner shared.

When someone wants to leave a memo, they pick a recipient (or a group, or "everyone in the family") and a one-line topic — *"the spaghetti recipe Nani used to make,"* *"what really happened the year we moved,"* *"how I met your father."* That's it. Claude takes over from there.

Claude conducts an interview in the recipient's voice. If you're recording for your daughter, Claude asks questions in your daughter's voice — questions she would actually ask, follow-ups she would actually make, conditioned on what Claude already knows about your relationship with her from prior sessions. You answer naturally, talking back to your daughter who isn't there.

When your daughter opens the app and plays the memo, she hears it as a single conversation in your voice — the questions Claude asked (rendered in her voice on your end) play back to her in your voice, threaded with your answers. To her ear, you sat down and told her the story, unprompted, exactly the way she always wished you would.

Every memo gets **automatically categorized** by Claude into themes — Recipes, Childhood, Family History, Advice, Stories About [Person], Health, Confessions, Day-to-Day. The family tree becomes browsable not just by person but by theme: *"Show me every recipe Ma ever recorded,"* *"Show me every story about Dadu,"* *"Show me everything anyone has said about the year we moved."*

The voice-to-text accessibility layer means an 85-year-old grandmother who has never typed a sentence in her life can use the entire app by talking to it. She says *"I want to tell Aanya about the time the well broke,"* and Claude takes it from there.

### The four hard product decisions

**1. The unit is the family, not the user.** One account per family. Profiles inside it. This mirrors how families actually think — *"we're on the family plan"* — and it kills the cold-start problem that usually murders social products. You don't recruit users one at a time; you onboard whole families.

**2. Profile-level privacy, owner-controlled.** Every memo is posted to the recorder's own profile. The recorder chooses who in the family can hear it: *just my daughter Aanya,* *all my grandchildren,* *everyone except my brother,* *everyone.* The privacy is not at the family level — it's at the memo level, controlled by the person who recorded it. Nobody else in the family can override this. Not even an admin.

**3. AI categorization is automatic and editable.** Claude tags every memo with categories the moment the recording ends. The user can re-tag, but doesn't have to. The browse-by-theme experience exists from day one without anyone doing data entry.

**4. Voice is the entire interface for elders.** No menus. No buttons that say *"Tap to record."* You open the app and Claude says *"What do you want to share today?"* You answer, and the rest happens.

### What's in the family tree

- Every family member is a node. Photo, name, relationship, voice sample.
- Edges show relationships (parent, sibling, spouse, child).
- Tapping a node opens that person's profile.
- A profile shows: their bio, the memos they recorded that you have access to, the memos other family members recorded *about* them that you have access to, and the categories present in their archive.
- "About them" is itself a category Claude maintains automatically — when Ma records a memo about her father, it gets cross-filed onto her father's profile under "Stories about Dadu" without anyone tagging it manually.

### What's in a profile when you open it

Three views, switchable:

- **Memos** — what this person recorded, organized by category.
- **About them** — what other family members have said about this person, organized by who said it.
- **Tree** — this person's place in the family, with quick-jump to the people they're connected to.

### Privacy mechanics, concretely

When you finish recording a memo, you see one screen:

> **Who should hear this?**
> - [ ] Aanya
> - [ ] Rohan
> - [x] Ma
> - [x] Pa
> - [ ] Everyone in the family
>
> [ Save ]  [ Save and post ]

Defaults are settable per family member ("Ma's default audience is *everyone except the grandkids*"). The user's choice is final and not overridable. If they want to change it later they can — but only the recorder can.

### Voice cloning, with guardrails

Voice clones are the magic and the liability. Same rules as before, made stricter for the family context:

- Voice clones are **family-scoped**. Aanya's voice clone can only be used to ask questions in memos sent *to* Aanya, played back to the recorder during the recording session. It cannot be exported, cannot be used outside the family account, cannot be heard by anyone other than the person recording the memo.
- Claude generates **questions only**. Never statements. The cloned voice is never used to put declarative words in someone's mouth.
- Either family member can revoke voice consent at any time. Past memos remain playable; no new ones can be generated using their voice.
- The first time anyone hears a question in a family member's cloned voice, the app says (in writing and aloud): *"You're about to hear questions in Aanya's voice. Aanya recorded these herself so we could ask them for her."*

### The accessibility layer (voice-to-text)

The whole app has to be operable by someone who has never owned a smartphone. Concretely:

- Every screen has a **single ambient prompt** spoken by Claude when it loads — *"This is your profile, Ma. You have three new memos waiting. Should I play them?"*
- Every action that elsewhere in the world would be a button tap is also available as a spoken command. *"Play the new one from Aanya." "Send a memo to my brother." "Stop." "Repeat that."*
- Voice-to-text is used not only for the interview answers but for **navigation**, **topic selection**, and **audience selection** ("Send this just to Aanya, not the boys").
- The screen still exists for younger family members who prefer it — voice and visual operate as parallel interfaces, not one fallback for the other.

### The end product, after a year of use

A family of eight, spread across three countries, has 200+ memos in the archive. Every grandchild has heard their grandmother tell stories that grandmother never knew how to start telling. Every recipe is recorded. The hardest year is on the record. Everyone has a place in the tree.

When the grandmother dies, nothing of her dies with her. Her grandchildren can ask her profile *"tell me about the time you left Hyderabad"* and play back her answer, in her voice, the way she actually told it.

This is the product.

### Why it wins

- **Emotional moat.** Every family that uses it for six months can't leave. The archive is irreplaceable.
- **Onboarding is one family at a time, not one user at a time.** Whoever installs it pulls in 4–10 people.
- **Claude's capabilities map to the problem with no slack.** Interview generation, voice rendering, automatic categorization, multi-turn memory, multimodal understanding — every Claude capability lands somewhere useful.
- **The demo makes the room cry.** This is not a small thing. Hackathon judges, investors, and first users all decide based on the same emotional moment.

---

## Part 2 — The Build Prompt for Claude Code

> Save this as `SPEC.md` at the root of your repo. Open Claude Code and tell it: *"Read SPEC.md end to end. Then follow the four-phase build process in section 0. Do not skip phases."*

---

# Build: Kin

> A shared family voice archive where Claude interviews each member in the voice of whoever they're talking to. One family account, Netflix-style profiles, family tree navigation, profile-level privacy controlled by the recorder, automatic AI categorization, voice-first interface for elders.

You are building this as a **hackathon submission**. Read this entire document before writing a single line of code. Push back on any part of this spec that you think is wrong — I'd rather be challenged in `BRAINSTORM.md` than have you silently work around a bad instruction.

---

## 0. How you will work (non-negotiable)

Four sequential phases. Do not skip.

1. **BRAINSTORM** → write `BRAINSTORM.md`: 10+ open questions you have, 5+ risks, 3 "wow moments" you want to design for, 3 things that could push this from hackathon demo to real product, and any pushback on this spec. Stop. Wait for me.
2. **DESIGN.md** → produce `DESIGN.md` per the Google Labs spec (`github.com/google-labs-code/design.md`). YAML front matter for tokens, markdown body for rationale. Section order: Overview → Colors → Typography → Layout → Elevation → Shapes → Components → Do's and Don'ts. Use `{token.path}` references throughout. Run `npx @google/design.md lint DESIGN.md` and fix every error before continuing.
3. **PLAN** → write `PLAN.md`: file tree, route map, data model (with the exact privacy fields), Anthropic API call inventory (with model IDs and rough token budgets), audio capture strategy, voice cloning strategy, voice-to-text strategy, and a TODO list ordered by dependency. Mark each item **demo-critical** or **nice-to-have**. Be ruthless about the cut line.
4. **BUILD** → implement against the plan. After every meaningful chunk, run the app and walk the demo flow manually. Update `PLAN.md` with what's done.

Use a TODO list throughout. Keep the four phases visible in your work — don't blur them.

---

## 1. The product, in one paragraph

A family creates one shared account. Each member gets a profile inside it (Netflix-style). Anyone can browse the family tree and open anyone's profile, but each profile's contents are gated by per-memo privacy that the recorder controls. To leave a memo, a family member picks a recipient and a one-line topic; Claude conducts an interview in the recipient's voice, the recorder answers naturally, and the recipient later hears the whole exchange rendered in the recorder's voice. Every memo gets automatically categorized into themes (Recipes, Childhood, Family History, Advice, Stories About [Person], etc.) so the archive is browsable by person and by theme. Elders use it entirely by voice.

---

## 2. Anti-patterns — do not build any of this

- ❌ Chat-bubble UI. This is not a messaging app.
- ❌ Purple/blue SaaS gradients. Aesthetic is archival, not product-y.
- ❌ Emojis. None. Anywhere.
- ❌ "Hi! I'm Claude 🎤" energy. We are a quiet third presence, not a mascot.
- ❌ Inter/Roboto/system fonts. Pick characterful typography (see §3).
- ❌ Long signup flows. Time-to-first-memo for a returning user must be under 30 seconds.
- ❌ Hallucinated content. Memos are verbatim. Categorization is auto-suggested but always editable.
- ❌ One privacy setting for the whole family. Privacy is per-memo, controlled by the recorder, not overridable by anyone.
- ❌ Buttons-only interfaces. Every primary action must also be voice-accessible.
- ❌ Fabricated speech in cloned voices. Claude renders questions in cloned voices. Never statements. Never declarative content.

---

## 3. DESIGN.md — produce this in Phase 2

Follow the Google Labs DESIGN.md spec exactly. Token references via `{path}`, prose for rationale, lint must pass with zero errors. Export Tailwind config from it: `npx @google/design.md export --format tailwind DESIGN.md`.

**Aesthetic direction (commit fully — do not soften):**

> **A family album printed in 1972 that someone pulled off a shelf today. Warm paper, sturdy serifs, hand-labeled tabs. It feels like memory, not technology.**

References: hardcover family albums, the National Geographic archive, Wim Wenders portraits, Studio Ghibli interiors, the inside cover of a well-loved cookbook, Apple's "Sharing Stories" campaign, StoryCorps booth interiors. **Not** Notion. **Not** Linear. **Not** WhatsApp. **Not** any meditation app.

**Token decisions (refine values but stay in this register):**

- **Palette**: warm cream/limestone background (not pure white), deep ink primary (not pure black), one muted accent — terracotta clay, sepia, or oxblood. A second accent only if it's a deeper, dustier version of the first. No gradients except optional paper-grain overlay.
- **Typography**: a serif display face with character (Fraunces, GT Sectra, Playfair Display, Source Serif, Cormorant Garamond — pick one and own it) for names, profile headers, pull quotes, and questions; a quiet sans (Public Sans, Söhne) for UI chrome and metadata. The transcript renders in the serif at memoir-book proportions (65ch, 1.7 line-height).
- **Texture**: subtle paper grain or noise on backgrounds. Long-form content feels printed.
- **Motion**: slow and patient. Crossfades, not slides. Page-turn metaphors. Nothing bounces.
- **Shapes**: soft rounded corners (4–8px), no hard edges, no glassmorphism, no neumorphism.
- **The family tree itself**: rendered as nodes with photo portraits and serif name labels, connected by hand-drawn-feeling lines. Avoid org-chart aesthetic. Closer to a hand-illustrated genealogy page than a Figma diagram.

Required component tokens: `button-primary`, `button-secondary`, `button-ghost`, `surface-card`, `surface-page`, `transcript-block`, `pullquote`, `record-indicator`, `topic-chip`, `category-tag`, `tree-node`, `tree-edge`, `profile-portrait`, `voice-input-prompt`. Define hover/pressed variants. Lint with zero errors.

---

## 4. Tech stack

- **Next.js 15 (App Router) + TypeScript strict mode.**
- **Tailwind v4**, theme generated from DESIGN.md via the design.md CLI export.
- **Anthropic SDK** (`@anthropic-ai/sdk`):
  - `claude-opus-4-7` for the live interviewer (streaming, low latency).
  - `claude-sonnet-4-6` for post-session organization, categorization, and family tree relationship inference.
- **Audio capture**: `MediaRecorder` API, webm/opus, chunked every 30s for resilience.
- **Speech-to-text**: OpenAI Whisper (`whisper-1`) for transcription accuracy on accented and elderly voices. This is also what powers the voice-to-text navigation layer (§9). Fallback to Web Speech API only if no key is configured.
- **Text-to-speech for cloned voices**: ElevenLabs voice cloning for the question-rendering layer. Each family member's clone is built from a 60–90 second consented sample captured during onboarding. If no key is configured, fall back to ElevenLabs default voices and clearly mark sessions as "default voice" in the UI.
- **Storage**: IndexedDB for local-first audio archive in MVP. The family owns the files. Add an export-as-zip flow per profile and per category.
- **No external auth.** A family is identified by a shared family code (six-word phrase). Profile selection inside the family is unguarded — it works exactly like Netflix profiles. This is the right tradeoff for a hackathon demo and arguably for the real product too. Document this choice in `PLAN.md`.
- **No external database in MVP.** All state lives in IndexedDB keyed by family code. A future server is a v2 problem.

If anything above is unavailable in your environment, degrade gracefully and document in `PLAN.md`.

---

## 5. Data model

These are the core entities. Define them as TypeScript types in `lib/types.ts` before writing any UI.

```typescript
type Family = {
  id: string;             // family code, e.g. "warm-river-cedar-stone-rose-amber"
  name: string;           // "The Madhunapantula family"
  createdAt: string;
  members: Member[];
  tree: TreeEdge[];       // explicit relationship edges
};

type Member = {
  id: string;
  displayName: string;
  fullName: string;
  relationshipLabel: string;   // free text: "Ma", "Dadu", "Aanya's husband Rohan"
  photoUrl?: string;           // local blob URL
  voiceCloneId?: string;       // ElevenLabs voice ID, present iff consent granted
  voiceConsentAt?: string;     // ISO timestamp
  voiceRevokedAt?: string;     // if set, no new generations in this voice
  defaultAudience?: AudienceRule;  // applied to new memos by default
  createdAt: string;
};

type TreeEdge = {
  fromMemberId: string;
  toMemberId: string;
  kind: "parent" | "child" | "spouse" | "sibling" | "other";
  label?: string;
};

type Memo = {
  id: string;
  recorderMemberId: string;
  intendedRecipientMemberIds: string[];   // who the recorder was talking to
  audience: AudienceRule;                 // who can play this memo back
  topic: string;                          // the one-line prompt
  audioBlobKey: string;                   // IndexedDB key
  durationSeconds: number;
  createdAt: string;
  transcript: TranscriptBlock[];          // verbatim, lightly cleaned
  rawTranscript: string;                  // unedited Whisper output
  pullQuotes: string[];
  categories: CategoryTag[];              // auto-generated, editable
  aboutMemberIds: string[];               // cross-filing: who this memo is about
  voiceUsedForQuestions: string;          // memberId whose voice asked the questions
};

type TranscriptBlock = {
  speaker: "interviewer" | "recorder";
  text: string;
  startMs: number;
  endMs: number;
};

type CategoryTag = {
  slug: string;       // "recipes", "childhood", "stories-about-{memberId}"
  label: string;      // "Recipes", "Stories about Ma"
  source: "ai" | "user";
};

type AudienceRule =
  | { kind: "everyone" }
  | { kind: "include"; memberIds: string[] }
  | { kind: "exclude"; memberIds: string[] };
```

The `audience` field is the load-bearing privacy control. It is set by the recorder at memo creation time and editable only by the recorder. No admin override. Enforce this in a single function `canMemberPlayMemo(member, memo, family): boolean` and use it everywhere — never inline.

---

## 6. Routes / screen map

```
/                           → family code entry / onboarding
/family                     → family tree (home for a logged-in profile)
/family/profile/[memberId]  → a member's profile (Memos / About them / Tree tabs)
/family/category/[slug]     → all memos in a category, across the family
/family/record              → new memo flow (recipient picker → topic → interview)
/family/record/[memoId]/listen  → playback of a single memo
/family/onboarding          → family setup (first time)
/family/onboarding/voice    → voice consent + sample capture
/family/profiles            → Netflix-style profile picker
```

Every route has a voice-prompt entry: when the page loads, Claude can speak a one-line description of where the user is and what they can do, on demand (§9).

---

## 7. The five core flows

### 7.1 Family creation (one-time, by whoever installs first)

- Single-screen setup. The installer enters their own profile (name, relationship label, optional photo) and is prompted to add at least two more family members. They can add more later.
- On completion, the app generates a six-word family code and shows it large on screen with an export option (text, image, AirDrop). They share this code with everyone else who needs to join.
- The family tree starts as a flat list. The installer can connect relationships immediately or skip to "build the tree later."

### 7.2 Joining an existing family

- Enter the family code. Pick your profile from the list (or "I'm not on the list yet" → add yourself). No password. This is intentional. Document it in `PLAN.md` and make it easy to harden later.

### 7.3 Profile picker

- Netflix-style grid of family member portraits. Tap your own to enter as that profile. Profile choice is sticky on this device until manually changed.

### 7.4 Recording a memo

- From the home tree or from your own profile, tap **New memo** (or say *"I want to record a memo"* — see §9).
- **Step 1 — Recipient.** Pick one or more family members from a portrait grid. *"This memo is for Aanya."* Voice-selectable: *"Send this to Aanya."*
- **Step 2 — Topic.** Speak or type a single line. *"I want to tell Aanya the recipe for the spaghetti my mother used to make."* This is also the title of the memo.
- **Step 3 — Voice consent check.** If the recipient has not yet recorded a voice sample, Claude proceeds in the recipient's default ElevenLabs voice and surfaces a small note: *"Aanya hasn't recorded her voice yet. I'll ask in a stand-in voice for now."*
- **Step 4 — The interview.** Claude speaks the first question in the recipient's voice. The recorder answers. Adaptive follow-ups, exactly as in the Witness interview prompt (see §11 for the full system prompt). Single breathing dot for record indicator. Question rendered in serif type, center-screen, fading in as Claude speaks. Soft waveform of the recorder's voice while they speak. Two controls only: **Pause**, **Wrap up**.
- **Step 5 — Audience selection.** When the recorder taps **Wrap up** (or says *"I'm done"*), they see one card: **Who should hear this?** Pre-filled with the intended recipient(s) and the recorder's `defaultAudience`. They can adjust freely. Final tap: **Save**.
- **Step 6 — Organization.** Loading screen with Claude's voice: *"Organizing what you said about the spaghetti recipe."* Sonnet pass runs (§8). When done, transition to the Memo View (§7.5).

### 7.5 Listening to a memo (the recipient's experience)

- Memo cards appear on the recipient's profile and on the family tree's "new for you" rail.
- Tapping a card opens the Memo View — a memoir-style page (same aesthetic as Witness's reveal screen):
  - Title (the topic, in serif).
  - Subtitle (recorder's name, date, any categories).
  - Pull quotes (3–5, verbatim, on their own cards).
  - Full transcript, chaptered, in serif at memoir proportions.
  - Audio player with the full recording. Playback uses the recorder's voice for both the questions and the answers — listen to §11 carefully.
  - Three actions: **Listen**, **Download (.zip)**, **Reply**.
- Tapping **Reply** flips the flow: the listener becomes the recorder, the original recorder becomes the recipient, and Claude conducts a new interview in the original recorder's voice.

---

## 8. The post-session organization pass (Sonnet)

Immediately after recording, send the full Whisper transcript to `claude-sonnet-4-6` with structured-output (tool use) to do four jobs in one call:

1. **Light cleanup** — remove filler ("um", "uh", repeated stutters) without changing any substantive word. Track every cleanup so the raw transcript is preserved.
2. **Chapter the transcript** — 2–6 chapter titles drawn from the actual content of what was said. Specific, not generic ("The summer the well broke," not "Childhood").
3. **Pull quotes** — 3–5 verbatim sentences, emotionally or biographically loaded, standalone-readable. Verbatim only. Better empty than fabricated.
4. **Categorize** — auto-tag into a small fixed taxonomy plus dynamic per-person tags:

   Fixed: `recipes`, `childhood`, `family-history`, `advice`, `health`, `day-to-day`, `confessions`, `stories`, `places`, `traditions`.
   
   Dynamic: for each family member meaningfully discussed in this memo, emit a `stories-about-{memberId}` tag. This is how cross-filing onto other people's profiles works.

Output schema:

```json
{
  "epigraph": "string (verbatim sentence from recorder)",
  "chapters": [{
    "title": "string",
    "blocks": [{ "speaker": "interviewer" | "recorder", "text": "string" }]
  }],
  "pullQuotes": ["string"],
  "categories": [{ "slug": "string", "label": "string" }],
  "aboutMemberIds": ["string"]
}
```

Render this as the Memo View. Save the raw transcript alongside.

---

## 9. The voice-to-text accessibility layer

This is the feature that makes Kin usable by an 85-year-old who has never owned a smartphone. Build it as a first-class layer, not an afterthought.

**Two modes, switchable from any screen:**

- **Voice-first mode** — for elders. On every screen, Claude speaks a one-line ambient prompt when the page loads: *"This is your profile, Ma. You have three new memos waiting. Should I play them?"* A persistent microphone control listens for spoken commands. Visual UI is still present and large, but the user can ignore it entirely.
- **Visual mode** — for everyone else. Standard tap interactions. The voice layer is dormant unless explicitly invoked by a microphone control.

A profile-level setting determines which mode loads by default. The setting is one toggle: **"Read everything to me and let me speak."**

**What voice commands must work in voice-first mode (minimum set):**

- *"What's on my profile?"* → ambient summary.
- *"Play the new one from Aanya."* → start the most recent unplayed memo from a specific member.
- *"Stop." / "Pause." / "Repeat that." / "Go back."* → playback controls.
- *"Send a memo to my brother."* → start the recording flow with that recipient pre-filled.
- *"Send this just to Aanya, not the boys."* → audience selection during the post-record audience screen.
- *"I'm done."* → end the interview.
- *"Read me my family."* → read the family tree aloud, member by member.
- *"What did Aanya say last week?"* → search across recent memos.

Implement this as a small intent classifier: pipe each user utterance through a fast `claude-haiku-4-5` call that maps it to one of a fixed set of intents + slot fills (recipient, topic, etc). Document the intent set in `PLAN.md`.

**Critical UX rule**: Claude's voice in this layer is *not* a cloned family member voice. It's a single neutral, warm narrator voice (use a chosen ElevenLabs preset). Cloned voices are reserved for memo questions only, never for app navigation. This separation is non-negotiable — a family member's voice telling you "your battery is low" would be horrifying.

---

## 10. The family tree view

This is the home screen and the product's spatial metaphor. Build it well.

- Render as nodes (member portraits with serif name labels) connected by edges (relationships). Hand-drawn-feeling lines, not org-chart right angles.
- Layout: a hand-illustrated genealogy page, not a graph viz. Use a force-directed layout for initial placement, then let the user drag nodes to refine. Persist positions per family.
- Tap a node → open that profile.
- Long-press a node → quick actions: **Send a memo**, **See about them**, **Play their latest**.
- A small "New" badge appears on any node that has unplayed memos for the current profile.
- A search bar at the top: *"Search memos, people, recipes..."* Searches across transcripts using simple keyword + a Sonnet-powered semantic fallback.
- A "category rail" at the bottom: horizontal scroll of categories (Recipes, Childhood, Stories, Advice, etc.) with counts. Tap → category page (§6).

---

## 11. The interview system prompt (the heart of the product)

Drop this into the live interviewer Anthropic call. Tune it, but do not weaken it.

```
You are conducting a recorded family memo. The person you are
interviewing — the Recorder — wants to share something with another
family member, the Recipient, who is far away. The Recipient is not in
the room. You are standing in for them, asking the questions they would
ask if they were here.

You will be given:
- The Recorder's name and relationship to the Recipient.
- The Recipient's name and relationship to the Recorder.
- A one-line topic the Recorder wants to share.
- A summary of prior memos exchanged between these two people, if any.
- A summary of what Claude already knows about the Recipient's
  curiosities, voice, and the texture of this relationship.

Behavior:

- Speak as the Recipient would speak. Match their warmth and pace from
  prior recordings if available. Do not impersonate by stating opinions
  in their name — only ask questions they would ask.
- Ask ONE question at a time. Then stop. Long silences are fine.
- Open with something easy and grounding inside the topic. If the topic
  is the spaghetti recipe, don't open with "what's the recipe" — open
  with "where were you when you first learned to make this?" Earn the
  story.
- After every answer, ALWAYS follow up on the most emotionally alive
  detail before moving on. If they mention their mother, ask about her
  hands. If they mention a smell, ask what it reminded them of. The
  follow-up is where the gold lives.
- Move toward the substance of the topic gradually. The recipe itself
  comes near the end, after the kitchen has been described, after the
  mother has been remembered, after the year has been placed.
- If the Recorder gets emotional, slow down. Acknowledge briefly ("That
  sounds like it still matters to you"). Offer to keep going or stop.
  Never push past a clear refusal.
- Never summarize the answer back. They do the talking.
- Never say "as an AI." Never say "as Aanya, I would ask." Just ask.
- End the session when the Recorder seems complete, or when they say
  they're done, or when the Host taps wrap up.
- Closing question is always: "Is there anything you want me to know
  that I didn't think to ask?"
- Then thank them by name.

Output format per turn: just the spoken question. No preamble. No
markdown. No quotes. One question. Then stop.
```

Pass conversation history each turn. Include in the user message: running transcript, summary of topics covered, and (if available) a 200-word summary of "things the Recipient has historically asked the Recorder about" drawn from prior memos in the family archive.

---

## 12. Privacy enforcement (test this directly)

Write `lib/privacy.ts` exporting:

```typescript
function canMemberPlayMemo(viewer: Member, memo: Memo, family: Family): boolean
function memosVisibleTo(viewer: Member, family: Family): Memo[]
function canMemberEditMemoAudience(viewer: Member, memo: Memo): boolean
```

Rules:
- `canMemberPlayMemo` evaluates `memo.audience` against `viewer.id`. Owner (recorder) always passes.
- `canMemberEditMemoAudience` returns true iff `viewer.id === memo.recorderMemberId`. Always.
- No path through the codebase reads `memo.audioBlobKey` without first calling `canMemberPlayMemo`. Enforce with a wrapper function `playMemo(viewer, memo)` that throws on unauthorized access.

Write a unit test for each rule. Privacy bugs in this app are catastrophic.

---

## 13. Demo requirements (the only acceptance test that matters)

You will demo this in front of judges in roughly 4 minutes. The demo must:

1. Open the app with a pre-seeded family of 4 (Ma, Pa, Aanya, Rohan), each with portraits and consented voice samples.
2. Pick the Ma profile from the Netflix-style profile picker.
3. Show the family tree. Point out one node has a "New" badge.
4. Tap **New memo**. Pick Aanya as the recipient. Speak the topic: *"I want to tell Aanya the recipe for the spaghetti my mother used to make."*
5. Show Claude speaking the first question **in Aanya's cloned voice**. Run 3–4 turns. **One must be a follow-up Claude generated from a detail in the answer** — this is the proof point.
6. Tap **Wrap up**. Show audience selection (default-set to *just Aanya*, demonstrate changing it to *all the kids*).
7. Show the loading screen → reveal the Memo View. Read one pull quote. Show the auto-categorization (Recipes + Stories about Nani). Open the audio playback.
8. Switch profiles to Aanya. Show the same memo now visible on Aanya's "new for you" rail. Play it. **The questions are now in Ma's voice.**
9. Show the family tree now with cross-filing: the memo also appears on Nani's profile under "Stories about Nani."
10. End with one sentence: *"Every conversation in this family is now permanent."*

If any of those 10 steps don't run cleanly, the build is not done. Cut features elsewhere to make sure these work.

---

## 14. Stretch features (only after demo flow runs cleanly twice)

Priority order:
- **Search** — semantic search across the full transcript archive.
- **Photo memos** — attach an old photo to the topic; Claude asks the Recorder about it (multimodal).
- **Translation** — interview in the Recorder's first language, deliver the transcript in the Recipient's preferred language.
- **Export per profile** — one-tap zip of everything on a member's profile.
- **Memorial mode** — when a member has passed (admin marks the profile), their profile becomes read-only and is highlighted gently in the tree.

---

## 15. Code quality bar

- TypeScript strict mode, no `any`, no `@ts-ignore`.
- Every Anthropic SDK call lives in `lib/anthropic.ts`. No SDK calls in components.
- Every component that renders verbatim recorder content is named with a `Verbatim` prefix and has the comment: `// Renders unedited recorder content. Do not transform.`
- Privacy gate (`canMemberPlayMemo`) is the ONLY way to access memo audio. No back doors.
- No `console.log` in committed code. Use a `lib/log.ts` wrapper.
- Audio handling has explicit calm-serif error states for: mic denied, mic disconnected mid-session, tab backgrounded, Whisper timeout, ElevenLabs failure. No red toasts.
- Lighthouse accessibility ≥ 95. Voice-first mode adds a real-world accessibility burden — meet it.

---

## 16. README for judges

When done, write `README.md`:
- One-paragraph description (steal from §1).
- 60-second quickstart for a clone.
- Required env vars.
- The four hard product decisions (from the pitch).
- A "what we'd build next" section drawn from §14.
- An ethics note: voice clones are family-scoped, question-only, revocable. Verbatim is a feature.

---

## 17. Final note before you start

Kin wins because every judge in the room has a family member they wish they'd recorded. Build for that recognition. Every UI decision — the breathing dot instead of a blinking one, the serif instead of a sans, the silence instead of a chime, the family tree instead of a feed, the per-memo privacy instead of a single setting — is a vote for the kind of product this is.

Now write `BRAINSTORM.md`. Don't write code yet.
