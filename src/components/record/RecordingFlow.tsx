"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useProfile } from "@/hooks/useProfile";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { TreePortraitOval } from "@/components/tree/TreePortraitOval";
import { RecordIndicator } from "./RecordIndicator";
import { interviewTurn } from "@/lib/anthropic";
import { narrate } from "@/lib/elevenlabs";
import { finalizeMemo } from "@/lib/render";
import { isDemoMode, DEMO_MEMO_ID, DEMO_QUESTIONS } from "@/lib/demo";
import { DEMO_FAMILY_ID, SEED_SUBJECT_IDS } from "@/lib/seed";
import { getMemo } from "@/lib/storage";
import { subjectFor, type AudienceRule, type Subject } from "@/lib/types";
import { v4 as randomId } from "@/lib/uuid";

type Step = "recipient" | "topic" | "interview" | "listen-back" | "audience" | "saving";

export function RecordingFlow({ replyToMemoId }: { replyToMemoId?: string } = {}) {
  const router = useRouter();
  const { family } = useFamily(DEMO_FAMILY_ID);
  const { currentSubjectId } = useProfile();
  const recorder = useMediaRecorder();

  const [step, setStep] = useState<Step>("recipient");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [turnIndex, setTurnIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [audience, setAudience] = useState<AudienceRule | null>(null);
  const [parentMemoId, setParentMemoId] = useState<string | undefined>(undefined);
  const [parentRecorderName, setParentRecorderName] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [tabWasBackgrounded, setTabWasBackgrounded] = useState(false);

  // M.3 — flag if the tab was backgrounded mid-recording so we can warn calmly.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (recorder.state !== "recording" && recorder.state !== "paused") return;
    function onVis() {
      if (document.hidden) setTabWasBackgrounded(true);
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [recorder.state]);

  // Mic permission denial surfaces as recorder.state === "denied".
  useEffect(() => {
    if (recorder.state === "denied") {
      setMicError(
        "Microphone permission was denied. Allow it in your browser settings, then come back and try again.",
      );
    }
  }, [recorder.state]);

  // Reply: pre-fill recipient as the original memo's recorder, link parentMemoId.
  useEffect(() => {
    if (!replyToMemoId || !family) return;
    let cancelled = false;
    void (async () => {
      const parent = await getMemo(family.id, replyToMemoId);
      if (cancelled || !parent) return;
      setParentMemoId(parent.id);
      setRecipientIds([parent.recorderSubjectId]);
      const parentRecorder = subjectFor(family, parent.recorderSubjectId);
      if (parentRecorder) setParentRecorderName(parentRecorder.displayName);
      setStep("topic");
    })();
    return () => {
      cancelled = true;
    };
  }, [replyToMemoId, family]);

  if (!family || !currentSubjectId) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="type-metadata text-ink-tertiary">loading…</p>
      </main>
    );
  }

  const me = subjectFor(family, currentSubjectId);
  if (!me) return null;
  const myMember = family.members.find((m) => m.subjectId === me.id);

  const recipientSubjects = family.subjects
    .filter((s) => s.id !== me.id && family.members.some((m) => m.subjectId === s.id))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Demo path: Ma → Aanya → spaghetti recipe.
  const isDemoCandidate =
    isDemoMode() &&
    me.id === SEED_SUBJECT_IDS.ma &&
    recipientIds.length === 1 &&
    recipientIds[0] === SEED_SUBJECT_IDS.aanya;

  const memoId = isDemoCandidate ? DEMO_MEMO_ID : `memo-${randomId()}`;

  async function startInterview() {
    setStep("interview");
    setTurnIndex(0);
    setMicError(null);
    const q = await interviewTurn({
      memoId,
      topic,
      recipientName: recipientName(),
      recorderName: me!.displayName,
      rollingSummary: "",
      lastExchanges: [],
      turnIndex: 0,
    });
    setQuestions([q]);
    void narrate(q);
    void recorder.start();
  }

  async function nextTurn() {
    const i = turnIndex + 1;
    setTurnIndex(i);
    const q = await interviewTurn({
      memoId,
      topic,
      recipientName: recipientName(),
      recorderName: me!.displayName,
      rollingSummary: "",
      lastExchanges: [],
      turnIndex: i,
    });
    setQuestions((prev) => [...prev, q]);
    void narrate(q);
  }

  async function wrapUp() {
    recorder.stop();
    setStep("listen-back");
  }

  function continueToAudience() {
    setStep("audience");
    const fallbackAudience: AudienceRule = myMember?.defaultAudience ?? {
      kind: "include",
      subjectIds: recipientIds,
    };
    setAudience(fallbackAudience);
  }

  async function save() {
    if (!audience) return;
    setStep("saving");
    const blob = recorder.blob ?? new Blob([], { type: "audio/webm" });
    await finalizeMemo({
      memoId,
      familyId: family!.id,
      recorderSubjectId: me!.id,
      recorderVoiceCloneId: myMember?.voiceCloneId ?? null,
      intendedRecipientSubjectIds: recipientIds,
      audience,
      topic,
      recorderAudioBlob: blob,
      transcript: [], // demo path overrides via buildDemoMemo()
      rawTranscript: "",
      pullQuotes: [],
      categories: [],
      aboutSubjectIds: isDemoCandidate ? [SEED_SUBJECT_IDS.nani] : [],
      durationSeconds: Math.round(recorder.durationMs / 1000),
      parentMemoId,
    });
    router.push(`/family/record/${memoId}/listen`);
  }

  function recipientName(): string {
    return recipientIds
      .map((id) => subjectFor(family!, id)?.displayName)
      .filter(Boolean)
      .join(" and ");
  }

  return (
    <main className="relative z-10 mx-auto max-w-2xl px-md py-2xl">
      <nav className="flex items-center justify-between type-metadata text-ink-tertiary">
        <Link href="/family" className="hover:text-foliage-deep">← family tree</Link>
        <span className="text-blush-deep">A new memo from {me.displayName}</span>
      </nav>

      {step === "recipient" && (
        <RecipientStep
          subjects={recipientSubjects}
          selected={recipientIds}
          onChange={setRecipientIds}
          onContinue={() => setStep("topic")}
        />
      )}

      {step === "topic" && (
        <TopicStep
          recipientName={recipientName()}
          replyingToName={parentRecorderName}
          topic={topic}
          onTopicChange={setTopic}
          onContinue={startInterview}
          onBack={() => setStep("recipient")}
        />
      )}

      {step === "interview" && (
        <InterviewStep
          recipientName={recipientName()}
          questions={questions}
          turnIndex={turnIndex}
          recorderState={recorder.state}
          durationMs={recorder.durationMs}
          micError={micError}
          tabWasBackgrounded={tabWasBackgrounded}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onNextTurn={nextTurn}
          onWrapUp={wrapUp}
        />
      )}

      {step === "listen-back" && (
        <ListenBackStep
          recorderBlob={recorder.blob}
          isDemo={isDemoCandidate}
          onContinue={continueToAudience}
        />
      )}

      {step === "audience" && audience && (
        <AudienceStep
          family={family}
          recipientIds={recipientIds}
          audience={audience}
          onAudienceChange={setAudience}
          onSave={save}
          onBack={() => setStep("interview")}
        />
      )}

      {step === "saving" && <SavingStep recipientName={recipientName()} topic={topic} />}
    </main>
  );
}


function RecipientStep({
  subjects,
  selected,
  onChange,
  onContinue,
}: {
  subjects: Subject[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onContinue: () => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  return (
    <div className="mt-xl crossfade">
      <h1 className="type-display-l text-foliage-deep">Who is this memo for?</h1>
      <p className="type-body mt-sm text-secondary">Pick one person, or several.</p>
      <div className="mt-lg flex flex-wrap gap-lg">
        {subjects.map((s) => {
          const isSelected = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`flex flex-col items-center gap-sm rounded-md p-2 transition-all ${
                isSelected ? "bg-sage-plate ring-2 ring-foliage-deep" : "hover:bg-surface"
              }`}
            >
              <TreePortraitOval src={s.photoUrl} alt={s.displayName} size="sm" />
              <div
                className={`type-tree-name ${isSelected ? "text-foliage-deep" : "text-primary"}`}
              >
                {s.displayName}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={onContinue}
        className="mt-xl rounded-md bg-primary px-lg py-md type-ui-md text-on-primary transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}

function TopicStep({
  recipientName,
  replyingToName,
  topic,
  onTopicChange,
  onContinue,
  onBack,
}: {
  recipientName: string;
  replyingToName: string | null;
  topic: string;
  onTopicChange: (t: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-xl crossfade">
      <p className="type-metadata text-blush-deep">
        {replyingToName ? `Replying to ${replyingToName}` : `For ${recipientName}`}
      </p>
      <h1 className="type-display-l mt-2 text-foliage-deep">What do you want to share?</h1>
      <p className="type-body mt-sm text-secondary">One line. Speak naturally.</p>
      <textarea
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        placeholder="e.g. the spaghetti recipe my mother used to make"
        rows={3}
        autoFocus
        className="mt-lg w-full rounded-lg border border-divider/60 bg-surface-elevated p-md type-topic text-primary placeholder:text-ink-tertiary/60 focus:outline-none focus:ring-2 focus:ring-foliage-deep"
      />
      <div className="mt-lg flex gap-md">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
        >
          Back
        </button>
        <button
          type="button"
          disabled={topic.trim().length < 3}
          onClick={onContinue}
          className="rounded-md bg-primary px-lg py-md type-ui-md text-on-primary hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Begin
        </button>
      </div>
    </div>
  );
}

function InterviewStep({
  recipientName,
  questions,
  turnIndex,
  recorderState,
  durationMs,
  micError,
  tabWasBackgrounded,
  onPause,
  onResume,
  onNextTurn,
  onWrapUp,
}: {
  recipientName: string;
  questions: string[];
  turnIndex: number;
  recorderState: ReturnType<typeof useMediaRecorder>["state"];
  durationMs: number;
  micError: string | null;
  tabWasBackgrounded: boolean;
  onPause: () => void;
  onResume: () => void;
  onNextTurn: () => void;
  onWrapUp: () => void;
}) {
  const currentQ = questions[turnIndex] ?? "...";
  const lastQuestion = turnIndex >= DEMO_QUESTIONS.length - 1;
  return (
    <div className="mt-xl flex flex-col items-center gap-xl crossfade text-center">
      <p className="type-metadata text-blush-deep">{recipientName} is asking, in {recipientName}'s voice through Kin</p>

      <div className="rounded-lg border border-divider/40 bg-surface px-lg py-xl shadow-[0_2px_0_rgba(0,0,0,0.04)]">
        <p className="type-topic reading-width text-primary">{currentQ}</p>
      </div>

      <RecordIndicator active={recorderState === "recording"} />

      {micError ? (
        <p className="type-body text-blush-deep reading-width">{micError}</p>
      ) : (
        <p className="type-metadata text-ink-tertiary">
          {formatDuration(durationMs)} · question {turnIndex + 1}
        </p>
      )}

      {tabWasBackgrounded && !micError && (
        <p className="type-metadata text-blush-deep reading-width">
          The tab was in the background for a moment. Some browsers pause the
          microphone there — give your last sentence a once-over before saving.
        </p>
      )}

      <div className="flex gap-md">
        {recorderState === "recording" && (
          <button
            type="button"
            onClick={onPause}
            className="rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
          >
            Pause
          </button>
        )}
        {recorderState === "paused" && (
          <button
            type="button"
            onClick={onResume}
            className="rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
          >
            Resume
          </button>
        )}
        {!lastQuestion && (
          <button
            type="button"
            onClick={onNextTurn}
            className="rounded-md bg-foliage-deep px-lg py-md type-ui-md text-on-primary hover:bg-secondary"
          >
            Next question
          </button>
        )}
        <button
          type="button"
          onClick={onWrapUp}
          className="rounded-full bg-tertiary px-lg py-md type-ui-md text-on-tertiary hover:bg-accent"
        >
          I'm done
        </button>
      </div>
    </div>
  );
}

function AudienceStep({
  family,
  recipientIds,
  audience,
  onAudienceChange,
  onSave,
  onBack,
}: {
  family: import("@/lib/types").Family;
  recipientIds: string[];
  audience: AudienceRule;
  onAudienceChange: (a: AudienceRule) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const memberSubjects = family.subjects.filter((s) =>
    family.members.some((m) => m.subjectId === s.id),
  );
  const includedIds: string[] =
    audience.kind === "include" ? audience.subjectIds : audience.kind === "everyone" ? memberSubjects.map((s) => s.id) : [];
  const isEveryone = audience.kind === "everyone";

  function togglePerson(id: string) {
    const next = includedIds.includes(id)
      ? includedIds.filter((x) => x !== id)
      : [...includedIds, id];
    onAudienceChange({ kind: "include", subjectIds: next });
  }

  return (
    <div className="mt-xl crossfade">
      <h1 className="type-display-l text-foliage-deep">Who should hear this?</h1>
      <p className="type-body mt-sm text-secondary">
        Only the people you choose will hear this memo. You can change this later.
      </p>

      <div className="mt-lg flex flex-wrap gap-md">
        <button
          type="button"
          onClick={() => onAudienceChange({ kind: "everyone" })}
          className={`rounded-full px-lg py-md type-ui-md transition-colors ${
            isEveryone
              ? "bg-foliage-deep text-on-primary"
              : "bg-surface-elevated text-primary hover:bg-surface"
          }`}
        >
          Everyone in the family
        </button>
      </div>

      <ul className="mt-lg flex flex-col gap-sm">
        {memberSubjects.map((s) => {
          const checked = isEveryone || includedIds.includes(s.id);
          const wasIntended = recipientIds.includes(s.id);
          return (
            <li key={s.id} className="flex items-center gap-md">
              <input
                type="checkbox"
                id={`aud-${s.id}`}
                checked={checked}
                onChange={() => togglePerson(s.id)}
                className="h-5 w-5 accent-foliage-deep"
              />
              <label htmlFor={`aud-${s.id}`} className="flex items-center gap-sm">
                <span className="type-ui-md text-primary">{s.displayName}</span>
                {wasIntended && (
                  <span className="type-metadata text-blush-deep">intended recipient</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-xl flex gap-md">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-surface-elevated px-lg py-md type-ui-md text-primary hover:bg-surface"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-primary px-lg py-md type-ui-md text-on-primary hover:bg-secondary"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function ListenBackStep({
  recorderBlob,
  isDemo,
  onContinue,
}: {
  recorderBlob: Blob | null;
  isDemo: boolean;
  onContinue: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    if (isDemo) {
      // Demo path: there's no meaningful local recording — the published memo
      // uses the pre-rendered full playback. Skip preview audio.
      setAudioUrl(null);
    } else if (recorderBlob && recorderBlob.size > 0) {
      const url = URL.createObjectURL(recorderBlob);
      revoke = url;
      setAudioUrl(url);
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [recorderBlob, isDemo]);

  return (
    <div className="mt-xl flex flex-col items-center gap-lg crossfade text-center">
      <h1 className="type-display-l text-foliage-deep">Want to hear what you said?</h1>
      <p className="type-body text-secondary reading-width">
        Listening back is optional. The recording is yours either way — nothing is sent until you save.
      </p>

      {audioUrl ? (
        <audio
          src={audioUrl}
          controls
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="w-full max-w-md"
        />
      ) : (
        <p className="type-metadata text-ink-tertiary">
          {isDemo
            ? "(Demo — preview will play the recipient's stitched version after save.)"
            : "No audio captured. You can still save and re-record later."}
        </p>
      )}

      <div className="mt-md flex gap-md">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md bg-primary px-lg py-md type-ui-md text-on-primary hover:bg-secondary"
        >
          {playing ? "Continue when you're ready" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function SavingStep({ recipientName, topic }: { recipientName: string; topic: string }) {
  return (
    <div className="mt-2xl flex flex-col items-center gap-md text-center crossfade">
      <span className="block h-3 w-3 rounded-full bg-record breathe" />
      <p className="type-display-m text-foliage-deep">
        Organizing what you said about {topic.replace(/^I want to tell .+? /, "")}…
      </p>
      <p className="type-metadata text-ink-tertiary">A memo for {recipientName}.</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
