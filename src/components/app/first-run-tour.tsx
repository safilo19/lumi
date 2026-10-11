"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  SparkleIcon,
  MicrophoneIcon,
  NotePencilIcon,
  ExportIcon,
  ShieldCheckIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEPS = [
  { Icon: SparkleIcon, tint: "bg-accent-weak text-accent", title: "Welcome to Lumi", body: "Record your lectures and get clean, beautiful study notes - summaries, key terms, diagrams and more. Free, forever." },
  { Icon: MicrophoneIcon, tint: "bg-lime-weak text-lime-deep", title: "Record in any language", body: "Speak English, Urdu, or a mix. Lumi transcribes it and writes your notes in clear English, automatically." },
  { Icon: NotePencilIcon, tint: "bg-coral-weak text-coral", title: "Notes that actually teach", body: "Each note gets a big idea, highlighted key terms, worked examples, flowcharts, mindmaps and real math - not a wall of text." },
  { Icon: ExportIcon, tint: "bg-accent-weak text-accent", title: "Organise and export", body: "Sort notes by course, revise from your library, and export to PDF, a shareable image, or Word any time." },
  { Icon: ShieldCheckIcon, tint: "bg-lime-weak text-lime-deep", title: "Yours and private", body: "Everything lives on your device. No account, no cloud, no cost - just open Lumi and your notes are there." },
] as const;

export function FirstRunTour() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let on = true;
    Promise.resolve().then(() => {
      if (!on) return;
      try {
        if (!localStorage.getItem("lumi-tour-done")) setShow(true);
      } catch {}
    });
    return () => {
      on = false;
    };
  }, []);

  function finish() {
    try {
      localStorage.setItem("lumi-tour-done", "1");
    } catch {}
    setShow(false);
  }
  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else {
      finish();
      router.push("/record");
    }
  }

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-6 shadow-[var(--shadow-pop)]"
            initial={reduce ? false : { scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <button
              type="button"
              aria-label="Skip tour"
              onClick={finish}
              className="absolute right-4 top-4 text-ink-soft transition-colors hover:text-ink"
            >
              <XIcon size={20} weight="bold" />
            </button>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl",
                    current.tint,
                  )}
                >
                  <current.Icon size={32} weight="duotone" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-bold text-ink">
                  {current.title}
                </h2>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {[...STEPS.keys()].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === step ? "w-6 bg-accent" : "w-2 bg-line-strong",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    <ArrowLeftIcon size={16} weight="bold" />
                    Back
                  </Button>
                ) : null}
                <Button size="sm" onClick={next}>
                  {last ? "Start recording" : "Next"}
                  <ArrowRightIcon size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
