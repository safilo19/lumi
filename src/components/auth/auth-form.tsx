"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EnvelopeSimpleIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState<string | undefined>();

  // Surface the "expired or already-used link" bounce from /api/auth/verify.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "link") {
      setError("That sign-in link has expired or was already used. Try again.");
    }
  }, []);

  const title = mode === "signup" ? "Create your account" : "Welcome back";
  const sub =
    mode === "signup"
      ? "Use your CUST email to get started. It is free, always."
      : "Enter your email and we will send you a sign-in link.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not send the link.");
      setDevLink(data.devLink);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }
  // __APPEND_RENDER__
  return (
    <div className="w-full max-w-sm">
      <Link href="/" aria-label="NoteWeaver home" className="inline-block">
        <Logo />
      </Link>

      {sent ? (
        <div className="mt-10 rounded-[var(--radius-card)] border-2 border-line bg-surface p-6 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime-weak text-lime-deep">
            <CheckCircleIcon size={30} weight="fill" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            We sent a sign-in link to{" "}
            <span className="font-semibold text-ink">{email}</span>. Open it on
            this device to continue.
          </p>

          {devLink && (
            <div className="mt-5 rounded-[var(--radius-input)] border-2 border-dashed border-accent/40 bg-accent-weak/50 p-4 text-left">
              <div className="font-display text-xs font-semibold uppercase tracking-wide text-accent-weak-ink">
                Development mode
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Email is not wired up yet, so use your link directly:
              </p>
              <a href={devLink} className="mt-3 inline-block">
                <Button size="sm">
                  Open sign-in link
                  <ArrowRightIcon size={15} weight="bold" />
                </Button>
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          <h1 className="mt-10 font-display text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-ink-soft">{sub}</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-[var(--radius-input)] border-2 border-coral-weak-ink/20 bg-coral-weak px-4 py-3 text-sm font-semibold text-coral-weak-ink">
              <WarningCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form className="mt-7 flex flex-col gap-3" onSubmit={onSubmit}>
            <label className="flex h-13 items-center gap-2.5 rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-4 transition-colors focus-within:border-accent">
              <EnvelopeSimpleIcon size={18} className="text-ink-faint" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cust.pk"
                className="w-full bg-transparent font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-ink-faint"
              />
            </label>
            <Button type="submit" size="lg" disabled={loading}>
              {loading
                ? "Sending…"
                : mode === "signup"
                  ? "Create account"
                  : "Send sign-in link"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-soft">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-accent hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to NoteWeaver?{" "}
                <Link href="/signup" className="font-semibold text-accent hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
