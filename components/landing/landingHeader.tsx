"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  // Shrink slightly and deepen the shadow on scroll; drive the progress line.
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

  // Highlight the link for the section currently in view.
  useEffect(() => {
    const els = links
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) setActive(id);
          else setActive((prev) => (prev === id ? "" : prev));
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="anim-fade-down fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`relative mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-white/90 backdrop-blur-xl transition-all duration-300 ${
          scrolled
            ? "border-slate-200 shadow-xl shadow-slate-900/10"
            : "border-white/40 shadow-lg shadow-black/10"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 px-3 transition-all duration-300 sm:px-4 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Brand */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-lg pl-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-navy-950 text-sm font-bold text-white transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
            >
              W
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Workeva
            </span>
          </Link>

          {/* Links */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {links.map(({ href, label }) => {
              const isActive = active === href.slice(1);
              return (
                <a
                  key={href}
                  href={href}
                  aria-current={isActive ? "true" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-shine group inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-px hover:bg-slate-800 hover:shadow-lg hover:shadow-navy-950/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get started
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:hidden"
            >
              {open ? (
                <X aria-hidden className="size-4" />
              ) : (
                <Menu aria-hidden className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div
            className={`overflow-hidden transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}
          >
            <nav aria-label="Mobile" className="border-t border-slate-100 p-3">
              <ul className="space-y-1">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active === href.slice(1)
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:hidden"
              >
                Sign in
              </Link>
            </nav>
          </div>
        </div>

        {/* Scroll progress */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-transparent"
        >
          <div
            className="h-full origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>
    </header>
  );
}
