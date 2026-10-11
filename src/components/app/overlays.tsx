"use client";
import { useSyncExternalStore } from "react";
import {
  ArrowCounterClockwiseIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// --- confirm store -------------------------------------------------------
type Confirm = {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
} | null;
let confirmState: Confirm = null;
const confirmSubs = new Set<() => void>();
const emitConfirm = () => confirmSubs.forEach((f) => f());

export function confirmAction(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = {
      title: opts.title,
      message: opts.message ?? "",
      confirmLabel: opts.confirmLabel ?? "Delete",
      resolve,
    };
    emitConfirm();
  });
}
function settleConfirm(ok: boolean) {
  const s = confirmState;
  confirmState = null;
  emitConfirm();
  s?.resolve(ok);
}

// --- undo store ----------------------------------------------------------
type Undo = { message: string; onUndo: () => void; key: number } | null;
let undoState: Undo = null;
const undoSubs = new Set<() => void>();
let undoTimer: ReturnType<typeof setTimeout> | undefined;
const emitUndo = () => undoSubs.forEach((f) => f());

export function showUndo(message: string, onUndo: () => void) {
  undoState = { message, onUndo, key: Date.now() };
  emitUndo();
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    undoState = null;
    emitUndo();
  }, 6000);
}
function dismissUndo() {
  undoState = null;
  clearTimeout(undoTimer);
  emitUndo();
}

function useStore<T>(subs: Set<() => void>, get: () => T): T {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    get,
    get,
  );
}

export function Overlays() {
  const confirm = useStore(confirmSubs, () => confirmState);
  const undo = useStore(undoSubs, () => undoState);
  return (
    <>
      {confirm ? (
        <div
          className="no-print fixed inset-0 z-[96] flex items-center justify-center bg-ink/50 p-4"
          onClick={() => settleConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-5 shadow-[var(--shadow-pop)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-coral-weak text-coral">
                <WarningCircleIcon size={22} weight="fill" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-ink">
                  {confirm.title}
                </h2>
                {confirm.message ? (
                  <p className="mt-1 text-sm text-ink-soft">{confirm.message}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => settleConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="coral" onClick={() => settleConfirm(true)}>
                {confirm.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {undo ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-[97] flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex w-full max-w-md items-center gap-3 rounded-full border-2 border-line-strong bg-ink px-4 py-2.5 text-paper shadow-[var(--shadow-pop)]">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {undo.message}
            </span>
            <button
              type="button"
              onClick={() => {
                undo.onUndo();
                dismissUndo();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-sm font-bold text-lime-ink"
            >
              <ArrowCounterClockwiseIcon size={15} weight="bold" />
              Undo
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismissUndo}
              className="shrink-0 text-paper/70 transition-colors hover:text-paper"
            >
              <XIcon size={18} weight="bold" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
