import Link from "next/link";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Settings
      </h1>

      {/* profile */}
      <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-ink">
            AR
          </span>
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold text-ink">
              Ali Raza
            </div>
            <div className="truncate text-sm text-ink-soft">ali.raza@cust.pk</div>
          </div>
        </div>
      </section>

      {/* appearance */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-ink">Appearance</div>
            <div className="text-sm text-ink-soft">
              Switch between light and dark.
            </div>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* plan */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-accent-weak/50 p-5">
        <div className="font-medium text-accent-weak-ink">Free forever</div>
        <div className="mt-1 text-sm text-ink-soft">
          You are on the free plan built for CUST students. There is nothing to
          upgrade and nothing to pay.
        </div>
      </section>

      {/* account */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-[var(--shadow-card)]">
        <Link
          href="/about"
          className="flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-3 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <SignOutIcon size={18} />
          Sign out
        </Link>
      </section>
    </div>
  );
}
