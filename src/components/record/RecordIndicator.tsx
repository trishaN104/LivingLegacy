"use client";

// Breathing dot. Never blinks (a notification dot blinks; a presence breathes).
// Animation: 2.8s in/out cycle defined as `kin-breathe` in globals.css.
export function RecordIndicator({ active = true, label = "recording" }: { active?: boolean; label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2"
      aria-live="polite"
      aria-label={active ? label : "stopped"}
    >
      <span
        className={`block h-3 w-3 rounded-full bg-record ${active ? "breathe" : "opacity-30"}`}
      />
      <span className="type-metadata text-ink-tertiary">{active ? label : "paused"}</span>
    </div>
  );
}
