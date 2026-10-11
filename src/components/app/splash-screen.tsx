"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogoMark } from "@/components/brand/logo";

// A branded launch splash: animated glowing core with orbiting sparks, the Lumi
// wordmark springing in, and a shimmering progress bar — then it fades away to
// reveal the app. Shows on a full load (app cold start), not on soft nav since
// the root layout doesn't remount.
export function SplashScreen() {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dur = reduce ? 650 : 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // ease-out cubic
      setProgress(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 260);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const dots = [
    { c: "var(--lime)", d: 0 },
    { c: "var(--coral)", d: 0.15 },
    { c: "#fffdf8", d: 0.3 },
  ];

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          key="splash"
          role="status"
          aria-label="Loading Lumi"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--accent), #7a6bff)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* drifting glow blobs */}
          <motion.span
            className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-white/20 blur-3xl"
            animate={reduce ? {} : { x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="pointer-events-none absolute -right-16 bottom-16 h-72 w-72 rounded-full bg-lime/25 blur-3xl"
            animate={reduce ? {} : { x: [0, -40, 0], y: [0, -20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* glowing core + orbiting sparks */}
          <motion.div
            className="relative grid h-32 w-32 place-items-center"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={reduce ? {} : { rotate: 360 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            >
              {dots.map((dot, i) => (
                <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 120}deg)` }}>
                  <span
                    className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full"
                    style={{ background: dot.c, boxShadow: `0 0 14px ${dot.c}` }}
                  />
                </span>
              ))}
            </motion.div>
            <motion.div
              className="grid h-20 w-20 place-items-center rounded-[22px] bg-white/15 backdrop-blur-sm"
              animate={reduce ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <LogoMark className="h-14 w-14 shadow-lg" />
            </motion.div>
          </motion.div>

          {/* wordmark */}
          <motion.div
            className="mt-7 font-display text-4xl font-bold tracking-tight text-white"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Lu<span className="text-lime">mi</span>
          </motion.div>
          <motion.p
            className="mt-1.5 font-sans text-sm font-semibold text-white/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Turning lectures into brilliance
          </motion.p>

          {/* progress bar */}
          <div className="absolute bottom-16 flex w-56 flex-col items-center gap-2">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime to-white transition-[width] duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
              {!reduce ? (
                <motion.span
                  className="absolute inset-y-0 w-16 bg-white/40 blur-sm"
                  animate={{ x: ["-4rem", "14rem"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
            </div>
            <span className="font-mono text-xs font-bold text-white/70">{progress}%</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}