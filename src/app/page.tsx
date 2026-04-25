import Link from "next/link";

// "/" — family code entry / first-run chooser.
// Phase A puts a tasteful placeholder here so the dev server has a real
// landing page during scaffold validation. Phase H replaces it with the
// real entry flow (six-word code field + "Set up a new family" path).
export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex min-h-[calc(100vh-1px)] max-w-2xl flex-col items-center justify-center px-lg py-2xl text-center">
      <p className="type-metadata text-blush-deep">A family voice archive</p>
      <h1 className="type-display-xl mt-md text-foliage-deep">Kin</h1>
      <p className="type-pullquote mt-lg text-secondary reading-width">
        Every conversation in this family, on the record — without anyone
        trying.
      </p>

      <div className="mt-2xl flex flex-col items-stretch gap-md sm:flex-row">
        <Link
          href="/family/profiles"
          className="type-ui-md rounded-md bg-primary px-lg py-md text-on-primary transition-colors hover:bg-secondary"
        >
          Open a family
        </Link>
        <Link
          href="/family/onboarding"
          className="type-ui-md rounded-md bg-surface-elevated px-lg py-md text-primary transition-colors hover:bg-surface"
        >
          Set up a new family
        </Link>
      </div>

      <p className="type-metadata mt-2xl text-ink-tertiary">
        Demo mode is staged.  No account.  No password.  Just the family code.
      </p>
    </main>
  );
}
