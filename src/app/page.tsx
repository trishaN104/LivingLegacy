import Link from "next/link";
import { ApiKeyStatus } from "@/components/common/ApiKeyStatus";

export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex min-h-[calc(100vh-1px)] max-w-2xl flex-col items-center justify-center px-md py-2xl text-center">
      <p className="type-metadata text-blush-deep">A family voice archive</p>
      <h1 className="type-display-xl mt-md text-foliage-deep">Living Legacy</h1>
      <p className="type-pullquote mt-lg text-secondary reading-width">
        Every conversation in this family, on the record — without anyone
        trying.
      </p>

      <div className="mt-2xl flex w-full flex-col items-stretch gap-md sm:w-auto sm:flex-row">
        <Link
          href="/family/profiles"
          className="min-h-[64px] inline-flex items-center justify-center rounded-md bg-primary px-xl py-md type-ui-md text-on-primary shadow-md transition-colors hover:bg-secondary"
        >
          Open the family
        </Link>
        <Link
          href="/family/onboarding"
          className="min-h-[64px] inline-flex items-center justify-center rounded-md bg-surface-elevated px-xl py-md type-ui-md text-primary shadow-sm transition-colors hover:bg-surface"
        >
          Set up a new family
        </Link>
      </div>

      <p className="type-metadata mt-2xl text-ink-tertiary">
        No account. No password. Just the family code.
      </p>

      <div className="mt-xl w-full text-left">
        <ApiKeyStatus />
      </div>
    </main>
  );
}
