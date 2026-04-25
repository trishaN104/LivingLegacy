"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecordingFlow } from "@/components/record/RecordingFlow";

export default function RecordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RecordPageInner />
    </Suspense>
  );
}

function RecordPageInner() {
  const params = useSearchParams();
  const replyToMemoId = params.get("reply") ?? undefined;
  return <RecordingFlow replyToMemoId={replyToMemoId} />;
}

function Loading() {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center">
      <p className="type-metadata text-ink-tertiary">loading…</p>
    </main>
  );
}
