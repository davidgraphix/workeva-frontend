"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const navLink =
  "relative text-sm text-slate-300 transition hover:text-white after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:scale-x-100";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(y > 8);
      setProgress(max > 0 ? Math.min(y / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`anim-fade-down sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? "border-white/10 bg-navy-950/85 shadow-lg shadow-black/20"
          : "border-transparent bg-navy-950/40"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded bg-blue-600 text-sm font-bold text-white transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
          >
            W
          </span>
          <span className="text-base font-semibold text-white">Workeva</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <a href="#features" className={navLink}>Features</a>
          <a href="#how-it-works" className={navLink}>How it works</a>
          <a href="#security" className={navLink}>Security</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lg hover:shadow-white/10"
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Scroll progress */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/5">
        <div
          className="h-full origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}