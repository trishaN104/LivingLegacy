import Link from "next/link";

// Home is the front cover of the memoir. On phone it stacks; on desktop it
// reads as an editorial masthead: oversized wordmark on the left, blurb +
// CTAs on the right, dated like an issue.

export default function Home() {
  const issue = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-md py-md sm:px-xl lg:py-xl">
      <Masthead issue={issue} />

      <section className="relative mt-2xl grid grow grid-cols-1 items-center gap-2xl lg:mt-3xl lg:grid-cols-[1.05fr_0.85fr] lg:gap-[clamp(2rem,5vw,6rem)]">
        <CoverWordmark />
        <CoverBlurb />
        <DropOrnament />
      </section>

      <Colophon />
    </main>
  );
}

function Masthead({ issue }: { issue: string }) {
  return (
    <header className="rise flex flex-col gap-md border-b border-divider/60 pb-md sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-baseline gap-md">
        <span aria-hidden className="block h-2 w-2 rounded-full bg-tertiary" />
        <p className="type-metadata text-ink-tertiary">
          Volume I · {issue} · An archive of voices
        </p>
      </div>
      <p className="type-metadata text-ink-tertiary">
        Conducted by Claude · Kept by the family
      </p>
    </header>
  );
}

function CoverWordmark() {
  return (
    <div className="rise relative" style={{ animationDelay: "120ms" }}>
      <p className="type-metadata text-blush-deep">A FAMILY VOICE ARCHIVE</p>

      <h1 className="mt-sm flex flex-col leading-[0.85] text-foliage-deep">
        <span className="type-display-xl">Living</span>
        <span
          className="type-display-xl italic text-tertiary"
          style={{ marginLeft: "clamp(0.5rem, 4vw, 4rem)" }}
        >
          Legacy.
        </span>
      </h1>

      <div className="mt-xl flex items-center gap-md">
        <span aria-hidden className="block h-px w-20 bg-divider" />
        <span aria-hidden className="text-blush-deep">❀</span>
        <span aria-hidden className="block h-px w-20 bg-divider" />
      </div>

      <p className="type-pullquote mt-lg max-w-[28ch] text-ink-tertiary">
        Every conversation in this family,
        <br className="hidden lg:block" />
        on the record &mdash; without anyone trying.
      </p>
    </div>
  );
}

function CoverBlurb() {
  return (
    <div
      className="rise relative flex flex-col gap-lg lg:border-l lg:border-divider/60 lg:pl-xl"
      style={{ animationDelay: "260ms" }}
    >
      <p className="type-metadata text-ink-tertiary">From the editor</p>

      <p className="type-body text-secondary reading-width">
        Living Legacy is a quiet voice diary your family can keep together. An
        interviewer asks the questions you wish you had thought to ask. Each
        memo is held in your own browser, in the voice of whoever told it,
        forever.
      </p>

      <div className="mt-md flex flex-col gap-md sm:flex-row sm:flex-wrap">
        <Link
          href="/family/profiles"
          className="inline-flex min-h-[64px] min-w-[200px] items-center justify-center rounded-md bg-primary px-xl py-md type-ui-md text-on-primary shadow-md transition-colors hover:bg-secondary"
        >
          Open the family
        </Link>
        <Link
          href="/family/onboarding"
          className="inline-flex min-h-[64px] min-w-[200px] items-center justify-center rounded-md border border-divider/70 bg-surface-elevated px-xl py-md type-ui-md text-foliage-deep transition-colors hover:border-foliage-deep hover:text-primary"
        >
          Plant a new tree →
        </Link>
      </div>

      <p className="type-metadata text-ink-tertiary">
        No account. No password. Just the family code.
      </p>
    </div>
  );
}

function DropOrnament() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 220"
      className="drift pointer-events-none absolute -top-12 right-0 hidden h-44 w-44 lg:block"
    >
      <defs>
        <radialGradient id="cover-blur" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#9da98c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#9da98c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="110" rx="110" ry="110" fill="url(#cover-blur)" />
      <g
        stroke="#9c8975"
        strokeWidth="1.2"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      >
        <path d="M 30 110 C 60 60, 160 60, 190 110" />
        <path d="M 30 110 C 60 160, 160 160, 190 110" />
        <path d="M 110 30 C 60 60, 60 160, 110 190" />
        <path d="M 110 30 C 160 60, 160 160, 110 190" />
      </g>
      <g fill="#f0dad6" opacity="0.95">
        <circle cx="110" cy="40" r="6" />
        <circle cx="40" cy="110" r="5" />
        <circle cx="180" cy="110" r="5" />
        <circle cx="110" cy="180" r="6" />
      </g>
      <circle cx="110" cy="110" r="6" fill="#3a4f2c" opacity="0.85" />
    </svg>
  );
}

function Colophon() {
  return (
    <div className="rise mt-2xl border-t border-divider/60 pt-md" style={{ animationDelay: "440ms" }}>
      <div className="flex flex-col items-baseline justify-between gap-sm sm:flex-row">
        <p className="type-metadata text-ink-tertiary">
          Bound at home · Read aloud · Kept on this device
        </p>
        <p className="type-metadata text-ink-tertiary">
          Composed in Source Serif &amp; Fraunces
        </p>
      </div>
    </div>
  );
}
