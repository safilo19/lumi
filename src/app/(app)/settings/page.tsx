"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrashSimpleIcon, HardDrivesIcon } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearAllNotes } from "@/lib/local/notes";

export default function SettingsPage() {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function clearNotes() {
    setClearing(true);
    try {
      await clearAllNotes();
      setConfirming(false);
      router.push("/");
      router.refresh();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Settings
      </h1>

      {/* appearance */}
      <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
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

      {/* local storage */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <HardDrivesIcon
            size={20}
            weight="bold"
            className="mt-0.5 shrink-0 text-ink-soft"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-ink">Your notes live on this device</div>
            <div className="mt-1 text-sm text-ink-soft">
              Nothing is uploaded to a server and there is no account. Every note
              is stored only in this browser, visible to nobody else.
            </div>

            {confirming ? (
              <div className="mt-4 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-4 py-3">
                <div className="text-sm font-semibold text-coral-weak-ink">
                  Delete every note on this device? This cannot be undone.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="coral" onClick={clearNotes} disabled={clearing}>
                    <TrashSimpleIcon size={16} weight="bold" />
                    {clearing ? "Clearing…" : "Yes, delete all notes"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirming(false)}
                    disabled={clearing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setConfirming(true)}
                className="mt-4"
              >
                <TrashSimpleIcon size={16} weight="bold" />
                Clear all local notes
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
