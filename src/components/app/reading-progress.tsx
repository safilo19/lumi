"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon } from "@phosphor-icons/react";

// A thin reading-progress bar pinned to the top of the viewport plus a
// back-to-top button. It tracks whichever element actually scrolls (the app
// shell scrolls <main>, not the window), found by walking up from an anchor.
export function ReadingProgress() {
  const anchor = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let el: HTMLElement | null = anchor.current?.parentElement ?? null;
    let scroller: HTMLElement | null = null;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
        scroller = el;
        break;
      }
      el = el.parentElement;
    }
    scrollerRef.current = scroller;

    const read = () => {
      const st = scroller ? scroller.scrollTop : window.scrollY;
      const sh = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
      const ch = scroller ? scroller.clientHeight : window.innerHeight;
      const max = Math.max(1, sh - ch);
      setPct(Math.min(1, Math.max(0, st / max)));
      setShow(st > 600);
    };
    const raf = requestAnimationFrame(read);
    const t: HTMLElement | Window = scroller ?? window;
    t.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  function toTop() {
    (scrollerRef.current ?? window).scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div ref={anchor} aria-hidden className="h-0 w-0" />
      <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[70] h-1">
        <div
          className="h-full bg-gradient-to-r from-accent via-lime-deep to-coral transition-[width] duration-150 ease-out"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        className={cnShow(show)}
      >
        <ArrowUpIcon size={18} weight="bold" />
      </button>
    </>
  );
}

function cnShow(show: boolean): string {
  const base =
    "no-print fixed bottom-24 right-5 z-[70] flex h-11 w-11 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink shadow-[var(--shadow-pop)] transition-all lg:bottom-8";
  return `${base} ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`;
}
