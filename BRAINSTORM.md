# BRAINSTORM — Kin

Phase 1 deliverable per `SPEC.md` §0. I have read the spec end-to-end. Below are the questions I want answered, the risks I want named, the wow moments I want to design around, the moves that turn this from a demo into a real product, and where I think the spec is wrong. I'll stop after this and wait.

---

## 15 open questions (in priority order — top ones block design)

**1. Real-time cloned voice during the interview, or pre-rendered after each turn?**
The spec implies the recorder hears the recipient's cloned voice asking questions live. Streaming TTS through ElevenLabs adds 1–3s latency per question. Acceptable for an emotional pause, fatal if it stutters. Option A: stream. Option B: render each question while the recorder is mid-answer (predict next question early). Option C: cut cloned-voice-on-record entirely and only use it on playback. I'd default to **C for the hackathon, B for v2** — but want your call.

**2. On playback, are questions re-rendered in the recorder's voice fresh each time, or rendered once at save and frozen?**
This is load-bearing for the data model. If the recorder revokes voice consent later, frozen audio still plays; live re-rendering would break. Spec §pitch says "past memos remain playable" which implies frozen. Confirm.

**3. Does the recorder need a voice clone too?**
The recipient hears the memo "in your voice" — including the questions, which the recorder never literally spoke. That requires the recorder's clone. If the recorder hasn't consented, what does playback sound like? Default ElevenLabs voice for questions + real recorded audio for answers? That breaks the "single conversation" illusion.

**4. What's the latency budget for the elder voice layer (§9)?**
"Play the new one from Aanya" → playback start. The spec routes this through Haiku for intent. With network round-trip + STT + intent + audio fetch, we're easily at 4–6s of dead air. For an 85-year-old that feels broken. I want to spec a budget (≤2.5s to first audio?) and a regex fast-path for the fixed intent set, with Haiku as fallback only.

**5. Threat model for the family-code-only auth.**
Anyone with the six-word code can pick any profile, including profiles whose memos are tagged Confessions. The spec acknowledges this as a deliberate tradeoff. I want to confirm: **for the demo and v1, is "anyone in the household with the iPad has full read access to whatever Ma marked visible to them" acceptable?** If yes, document it loudly in onboarding. If no, we need a profile PIN as a stretch demo feature.

**6. Deceased members in the data model.**
Cross-filing onto "Nani's profile" is a demo step. Nani may be deceased — the demo treats Stories About Nani as a category target. Are deceased people full Members with no recording capability, or a separate "Subject" entity? Memorial mode is stretch (§14) but the data model needs to handle it from day one or §13 step 9 fails.

**7. Default audience semantics — global per recorder, or per-recipient?**
Spec hints at both. Most natural read: per recorder, with overrides per recipient ("memos to Aanya default to her only; memos to Pa default to all the kids"). Confirm.

**8. Reply UX — does the reply inherit the topic, or get its own?**
Spec §7.5: "tap Reply… Claude conducts a new interview in the original recorder's voice." Doesn't say what topic. I'd default to: prompt for a new one-line topic, link as a parent edge in the data model, and let categorization run independently.

**9. Storage realism for IndexedDB.**
200+ memos at webm/opus is GB-scale. Browsers evict origin storage opaquely. For the demo this doesn't matter. For a real family using it for a year, it's a data-loss bug waiting to happen. Acceptable for hackathon — but I want explicit acknowledgement, plus an `Export per profile` flow shipped in MVP not stretch.

**10. Whisper + ElevenLabs both call out — local-first claim is partial.**
Audio leaves the device for transcription and voice cloning. The spec's "the family owns the files" is true for archived audio but not for in-flight processing. The README ethics note (§16) needs to be honest about this.

**11. Family tree edges — how messy can relationships be?**
`parent | child | spouse | sibling | other`. Step-parents, in-laws, divorced parents, chosen family — all flatten to "other" + label. For demo, fine. For real families, the politics of a tree that can't represent a divorce will drive churn. Defer or design now?

**12. Voice consent capture during onboarding (§7.1).**
60–90 second consented sample. What does Claude prompt the user to say? Reading a script feels clinical for this aesthetic; freeform talking about themselves doubles as a first memo. I'd lean: the onboarding voice sample IS a first memo — "tell me one thing about yourself, anything" — and we keep the audio.

**13. Categorization of an in-progress recording.**
Spec runs Sonnet only after wrap-up. But the live interviewer (Opus) needs to know what's been said to ask follow-ups. Are we passing the running raw transcript on every Opus turn, or a rolling Claude-summarized version? Token budget matters — a 20-minute memo with full history per turn is expensive.

**14. Edit/delete after recording.**
If Ma cries and says something she'll regret, can she delete or edit before posting? Spec has no review step between Step 5 (audience) and Step 6 (organization). I want a confirm-and-listen-back step before save. Maybe: "Want to listen before sending?"

**15. Search across audio.**
§14 lists semantic search as stretch. But basic keyword search across transcripts is in §10 (tree view). Confirm: keyword search in MVP, semantic search post-demo.

---

## 7 risks

**R1. Real-time cloned-voice latency ruins the interview.**
Single biggest demo-flow risk. Every turn that takes >2s to hear a question feels like the app is broken. Mitigation: pre-render the opener, stream subsequent questions with a "thinking" visual (the breathing dot), have a non-cloned fallback voice ready.

**R2. Whisper accuracy on accented/elderly voices is uneven.**
The demo's emotional core is the elderly-voice user. Whisper-1 handles most accents well but struggles with very soft, mumbled, or heavily-accented speech — exactly the input we're optimizing for. Mitigation: temp prompt biasing with the topic + family member names; visible "press to repeat that part" affordance.

**R3. Privacy bug = trust death.**
`canMemberPlayMemo` must be the only path. One component that grabs `memo.audioBlobKey` directly and we leak. Mitigation per §12 is good — wrap audio access in `playMemo(viewer, memo)` and lint for direct `audioBlobKey` reads outside that wrapper.

**R4. Voice consent revocation cascades.**
If Aanya revokes mid-week, every memo that used her cloned voice for questions still plays (frozen audio) — but if we ever re-render anywhere, we break. The whole pipeline has to commit to "render once, store, never re-render" as an invariant.

**R5. Live API dependency in front of judges.**
Hackathon demos die on flaky wifi. Whisper, Opus, Sonnet, ElevenLabs all network-dependent. Mitigation: a "demo mode" flag that pre-renders the entire 4-minute scripted flow's audio so the demo can run offline if needed.

**R6. ElevenLabs voice cloning quality on a 60–90s sample.**
Their best clones come from 3–5 minutes of clean audio. 60–90s gets you adequate but not eerie-good. The demo's payoff (§13 step 8: "the questions are now in Ma's voice") only lands if it actually sounds like Ma. Mitigation: pre-record the demo family's samples with care; budget 3+ minutes of clean audio for the seed family even though the spec says 60–90s.

**R7. The "memoir-page" playback view buries the audio.**
The spec's aesthetic instinct is right (printed page > player) but the demo's emotional moment (§13 step 8) is the audio. If the play button is small and below the fold, judges miss it. Mitigation: large play button + waveform near the top, transcript below.

---

## 3 wow moments to design around

**W1. The first unprompted follow-up.**
Recorder mentions a tiny detail ("my mother's hands"); Claude — in the daughter's voice — asks about her hands. Recorder visibly softens. This is §13 step 5 and it has to be unmistakable: a deliberate beat of silence after the answer, then the follow-up arrives. The follow-up itself must be specific enough that no scripted bot could have produced it.

**W2. The voice flip on playback.**
Aanya opens the memo and hears the SAME conversation — but now the questions she heard rendered in her own voice on Ma's end are rendered in Ma's voice on her end. One conversation, two voices, depending on which side of it you sit on. This is the demo's emotional payload (§13 step 8) and the marketing image of the entire product.

**W3. The archive builds itself.**
After the recording, Ma sees her memo file itself onto Nani's profile under "Stories about Nani" — without her ever having tagged it (§13 step 9). The user's takeaway: "I just talked. The archive happened." That's the long-tail thesis from the pitch made visible in 30 seconds.

---

## 3 things that push this from demo to real product

**P1. Server-side family vault with end-to-end encryption + sync.**
Local-first IndexedDB is right for hackathon. But families across three countries on five devices need sync, and the privacy promise needs E2EE. Design the data model now as event-sourced (append-only log of memo events) so the v2 server is a sync layer, not a rewrite. The local IndexedDB becomes one node in the sync graph.

**P2. Facilitated onboarding for elders.**
The 85-year-old grandmother is the emotional center of the product but she will not install an app. The real onboarding flow is: a tech-fluent family member sits down with her in person, sets up her profile on her own device, walks through voice consent, and confirms she can navigate by voice alone. Build a "set up someone else" mode in the app — the facilitator drives a guided checklist on their phone, hands the elder her phone for the voice sample, and verifies the voice-first navigation works before walking out.

**P3. Prompted gap-filling that compounds the archive's value.**
The product gets more valuable as coverage approaches completeness. Surface gaps gently: "Ma has never recorded anything about her father. Would you like to ask her?" — sent to Aanya. The app becomes a quiet archivist nudging the family toward the recordings they didn't know they wanted. This is the retention loop *and* the moat.

---

## Pushback on the spec

**1. Cut real-time cloned voice on the recorder side for the hackathon.**
Spec implies the recorder hears the daughter's cloned voice live during the interview. This is the highest-risk piece of UX and probably the least essential — the magic is on the recipient's playback. For the demo I'd render questions in a neutral narrator voice (or as serif text on screen) on the recorder's side, and use cloned voices only on playback. Easier to ship, smaller failure surface, and the §13 demo as written still works (step 5 says "Show Claude speaking the first question in Aanya's cloned voice" — we can keep that for one or two pre-rendered questions, but not the live follow-ups).

**2. Drop the Haiku intent classifier for the elder voice layer; use a regex fast-path.**
The intent set in §9 is small and fixed. A 30-line regex/keyword matcher resolves 95% of utterances in <50ms. Haiku as a fallback for the long tail. Cloud-routing every utterance through an LLM is wrong for an interface where latency is the accessibility feature.

**3. Commit to one serif before DESIGN.md, not a list.**
"Fraunces, GT Sectra, Playfair Display, Source Serif, Cormorant Garamond" span warm-modern (Fraunces) to editorial-cold (Cormorant). For "a family album printed in 1972," **Source Serif** or **Fraunces** — not Playfair (too contemporary-magazine), not Cormorant (too stately-funereal). Pick one in DESIGN.md and own it.

**4. The "Reply" flow needs its own topic, not the parent's.**
Spec §7.5: tap Reply → Claude conducts a new interview in the original recorder's voice. But it doesn't say what topic. Replying to "the spaghetti recipe" with the same title produces nonsense ("here's the recipe for the spaghetti my mother used to make" → "let me also tell you the recipe for the spaghetti my mother used to make"). Reply should prompt a fresh one-line topic and link as a parent edge.

**5. Add a "listen back before sending" step.**
The flow goes: record → audience pick → save. Add an optional "want to hear it first?" beat between audience pick and save. For elders especially, the ability to hear themselves back before committing is the difference between feeling safe to record honest things and never recording at all.

**6. Audio playback needs more visual weight than the memoir-page treatment gives it.**
The aesthetic instinct (printed page > player) is right for browsing. But on a freshly-opened memo — especially during the demo — the audio is the payload. Lead with a large play button + waveform. The memoir page is below.

**7. Voice consent during onboarding should double as a first memo.**
Spec asks for a 60–90s sample, presumably from a script. Reading a consent script kills the aesthetic. Ask the user to say one thing about themselves — "tell me what your name is and one thing you want your grandchildren to know about you." Consent is captured, voice is sampled, and the family's first memo is in the archive before they've left onboarding.

**8. The "Memorial Mode" stretch (§14) leaks into MVP whether you want it or not.**
The §13 demo cross-files onto Nani's profile. If Nani is alive, fine. If Nani is deceased (as the name implies — Nani is grandmother in Hindi/Urdu and the demo's emotional gravity assumes she's gone), the data model needs a "subject without active profile" state from day one. This isn't optional; demo step 9 fails without it.

---

## Stopping here

Per §0: Phase 1 stops with this document. I will not begin DESIGN.md, PLAN.md, or any code until you've responded to the questions above and signed off on the pushback items.

Two things I most need from you to unblock Phase 2:
- A decision on **Q1 / Pushback #1** (real-time cloned voice on the recorder side: keep, cut, or compromise).
- A decision on **Q5** (acceptable threat model for family-code-only auth in v1).

Everything else can be answered in DESIGN.md drafts, but those two shape what we even draw.
