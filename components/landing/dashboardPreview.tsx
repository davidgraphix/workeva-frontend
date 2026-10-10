"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";

type Tone = "emerald" | "amber" | "blue";

const dotColor: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

const pool: { title: string; meta: string; tone: Tone }[] = [
  { title: "David clocked in", meta: "Head Office", tone: "emerald" },
  { title: "Sarah requested annual leave", meta: "Awaiting approval", tone: "amber" },
  { title: "Michael marked late", meta: "Head Office", tone: "amber" },
  { title: "Task assigned to Grace", meta: "Prepare sales report", tone: "blue" },
  { title: "Leave approved for Tunde", meta: "Sep 20 – Sep 23", tone: "emerald" },
  { title: "Amaka clocked in", meta: "Lagos Branch", tone: "emerald" },
  { title: "Task completed by John", meta: "Monthly review", tone: "blue" },
  { title: "Ifeoma requested sick leave", meta: "Awaiting approval", tone: "amber" },
];

const ageLabels = ["Just now", "1 min ago", "3 min ago", "6 min ago"];

const stats = [
  { label: "Present", value: 64, text: "text-emerald-600", bar: "bg-emerald-500" },
  { label: "Late", value: 7, text: "text-amber-600", bar: "bg-amber-500" },
  { label: "On leave", value: 3, text: "text-sky-600", bar: "bg-sky-500" },
  { label: "Absent", value: 11, text: "text-red-600", bar: "bg-red-500" },
];
const total = stats.reduce((sum, s) => sum + s.value, 0);

const week = [
  ["Mon", 72],
  ["Tue", 84],
  ["Wed", 91],
  ["Thu", 78],
  ["Fri", 88],
] as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CountUp({ to, active, duration = 1400 }: { to: number; active: boolean; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);

  return <>{value}</>;
}

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [items, setItems] = useState(() =>
    pool
      .slice(0, 4)
      .reverse()
      .map((event, i) => ({ ...event, id: i })),
  );
  const counter = useRef(4);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A new event arrives every few seconds, like a live feed.
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const timer = setInterval(() => {
      const n = counter.current++;
      const next = pool[n % pool.length];
      if (!next) return;
      setItems((prev) => [{ ...next, id: n }, ...prev.slice(0, 3)]);
    }, 3400);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <div ref={ref} className="relative mx-auto mt-16 max-w-4xl" style={{ perspective: "1600px" }}>
      <div aria-hidden className="absolute -inset-x-6 -top-6 h-40 rounded-full bg-violet-600/25 blur-3xl" />

      {/* Floating notification cards */}
      <div
        className="absolute -left-14 top-28 z-10 hidden transition-all duration-1000 ease-out lg:block"
        style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateX(-24px)", transitionDelay: "700ms" }}
      >
        <div className="anim-float flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-black/20">
          <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 aria-hidden className="size-4" />
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900">Leave approved</p>
            <p className="text-[11px] text-slate-500">Sarah · Annual leave</p>
          </div>
        </div>
      </div>

      <div
        className="absolute -right-14 top-56 z-10 hidden transition-all duration-1000 ease-out lg:block"
        style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateX(24px)", transitionDelay: "900ms" }}
      >
        <div className="anim-float-slow flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-black/20">
          <span className="grid size-8 place-items-center rounded-full bg-blue-50 text-blue-600">
            <MapPin aria-hidden className="size-4" />
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900">Clock-in verified</p>
            <p className="text-[11px] text-slate-500">Within Head Office radius</p>
          </div>
        </div>
      </div>

      {/* Frame */}
      <div
        className="relative rounded-t-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-blue-950/50 transition-[transform,opacity] duration-[1400ms] ease-out sm:p-3"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "rotateX(0deg) translateY(0)" : "rotateX(14deg) translateY(48px)",
          transformOrigin: "50% 100%",
        }}
      >
        <div className="rounded-t-xl bg-slate-50 p-4 text-left sm:p-6">
          {/* Window chrome */}
          <div aria-hidden className="mb-4 flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Today</p>
              <p className="text-lg font-semibold text-slate-900">Company overview</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
              <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Sample data
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-lg border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "none" : "translateY(12px)",
                  transition: "opacity .7s ease, transform .7s ease, box-shadow .3s",
                  transitionDelay: `${300 + i * 90}ms`,
                }}
              >
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.text}`}>
                  <CountUp to={s.value} active={inView} />
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full origin-left rounded-full ${s.bar} transition-transform duration-[1400ms] ease-out`}
                    style={{ transform: `scaleX(${inView ? s.value / total : 0})`, transitionDelay: `${500 + i * 90}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-5">
            {/* Live feed */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-3">
              <p className="text-sm font-medium text-slate-900">Recent activity</p>
              <ul className="mt-3 divide-y divide-slate-100">
                {items.map((item, i) => (
                  <li key={item.id} className="anim-feed flex items-center gap-3 px-1 py-2.5">
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${dotColor[item.tone]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.meta}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{ageLabels[i]}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weekly attendance */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-900">Attendance this week</p>
              <p className="text-xs text-slate-500">Percent of staff present</p>
              <div className="mt-4 flex h-28 items-end gap-3">
                {week.map(([day, value], i) => {
                  const today = i === week.length - 1;
                  return (
                    <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="text-[10px] font-medium tabular-nums text-slate-500">{value}%</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full origin-bottom rounded-t-md transition-transform duration-[900ms] ease-out ${
                            today ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-blue-100"
                          }`}
                          style={{
                            height: `${value}%`,
                            transform: `scaleY(${inView ? 1 : 0})`,
                            transitionDelay: `${700 + i * 110}ms`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}