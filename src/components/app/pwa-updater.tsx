"use client";

import { useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";

// Registers the service worker and shows an in-app "update available" bar when a
// newer build has been deployed. Registration is production-only so it never
// interferes with dev HMR (test it with `npm run build && npm start`).
export function PwaUpdater() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    let reg: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;

        // A build was already waiting when this page loaded.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // "installed" + an existing controller means this is an update,
            // not the very first install.
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(next);
            }
          });
        });
      })
      .catch(() => {
        // SW registration failing should never break the app.
      });

    // Notice new deploys without a manual refresh: re-check on an interval and
    // whenever the user returns to the tab.
    const check = () => reg?.update().catch(() => {});
    const interval = window.setInterval(check, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // __APPEND_UPDATER_UI__
  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-[var(--radius-card)] border-2 border-line-strong bg-surface px-4 py-3 shadow-[var(--shadow-pop)]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-weak text-accent-weak-ink">
          <ArrowClockwiseIcon weight="bold" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">A new version is ready</p>
          <p className="text-xs font-semibold text-ink-soft">
            Update now to get the latest Lumi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => waiting.postMessage("SKIP_WAITING")}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Update
        </button>
      </div>
    </div>
  );
}

