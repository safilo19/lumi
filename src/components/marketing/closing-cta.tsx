"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function ClosingCta() {
  const reduce = useReducedMotion();
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[var(--radius-card)] bg-accent px-6 py-16 text-center shadow-[var(--shadow-pop)] sm:px-12 lg:py-20"
        >
          <span className="lumi-blob -left-10 -top-16 h-56 w-56 bg-lime/40" aria-hidden />
          <span className="lumi-blob -bottom-16 -right-8 h-52 w-52 bg-coral/40" aria-hidden />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(600px circle at 50% -20%, rgba(255,255,255,0.9), transparent 60%)",
            }}
          />
          <h2 className="relative mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight text-accent-ink sm:text-4xl">
            Your next lecture could be your best set of notes.
          </h2>
          <p className="relative mx-auto mt-4 max-w-md leading-relaxed text-accent-ink/80">
            Set it up once, hit record, and walk out of class with notes already
            waiting.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link href="/">
              <Button size="lg" variant="secondary" className="group">
                Start free
                <ArrowRightIcon
                  size={18}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
