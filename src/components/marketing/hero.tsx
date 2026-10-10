"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon, MicrophoneIcon } from "@phosphor-icons/react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { NotePreview } from "@/components/note-preview";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* playful soft blobs */}
      <span className="nw-blob -top-24 right-[-6%] h-[380px] w-[380px] bg-accent/25" aria-hidden />
      <span className="nw-blob -bottom-32 left-[-8%] h-[320px] w-[320px] bg-lime/30" aria-hidden />

      <Container className="relative grid items-center gap-12 pt-16 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-24 lg:pb-28">
        <div className="max-w-xl">
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-line-strong bg-surface px-4 py-2 text-xs font-semibold text-ink-soft"
          >
            <MicrophoneIcon size={13} weight="fill" className="text-accent" />
            Built for CUST students
          </motion.span>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease }}
            className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Turn lectures into notes you&rsquo;ll actually revise from.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease }}
            className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            Record the class, and get clean, organised notes with diagrams,
            summaries and one-tap PDF export.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/signup">
              <Button size="lg" className="group">
                Start free
                <ArrowRightIcon
                  size={18}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Button>
            </Link>
            <Link href="#how">
              <Button size="lg" variant="secondary">
                See how it works
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <NotePreview />
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
