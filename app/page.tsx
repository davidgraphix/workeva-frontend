import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Check,
  ListChecks,
  MapPin,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { DashboardPreview } from "@/components/landing/dashboardPreview";
import { LandingHeader } from "@/components/landing/landingHeader";
import { Reveal } from "@/components/landing/reveal";
import { SpotlightCard } from "@/components/landing/spotlightCard";

export const metadata: Metadata = {
  title: "Workeva — workforce and company operations",
  description:
    "Attendance, leave and everyday work in a single view, so managers know who is in, what needs approving and what is outstanding.",
};

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MapPin,
    title: "Location-aware attendance",
    description: "Staff clock in and out from the office, verified against the work locations you define.",
  },
  {
    icon: CalendarCheck,
    title: "Leave that adds up",
    description: "Requests, balances and approvals in one flow, with the arithmetic done for you.",
  },
  {
    icon: ListChecks,
    title: "Everyday tasks",
    description: "Assign work, set priorities and deadlines, and see what is overdue at a glance.",
  },
  {
    icon: Users,
    title: "People and departments",
    description: "A searchable directory with profiles, roles and managers for every team.",
  },
  {
    icon: Bell,
    title: "Notifications that matter",
    description: "Managers hear about clock-ins, leave requests and new tasks as they happen.",
  },
  {
    icon: ScrollText,
    title: "A record you can trust",
    description: "Every consequential action is written to an audit trail.",
  },
];

const steps = [
  ["Set up your company", "Create your organization, add your office location and set working hours."],
  ["Invite your team", "Add departments and invite employees by email. They set up their own accounts."],
  ["Run your day", "Attendance, leave and tasks flow into one dashboard that shows what needs attention."],
];

const capabilities = [
  "Geofenced attendance",
  "Leave management",
  "Task tracking",
  "Employee directory",
  "Role-based access",
  "Audit trail",
  "Email notifications",
  "Reports and CSV export",
];

const securityPoints = [
  "Each company is fully isolated from every other company.",
  "Role-based access, so people only see what their role allows.",
  "Permissions enforced on the server, not just in the interface.",
  "An audit log of important actions across your organization.",
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const ctaPrimary =
  "btn-shine group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/40 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";
const ctaSecondary =
  "inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-white text-slate-900">
      <LandingHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-950">
          <div
            aria-hidden
            className="anim-grid absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(37,99,235,0.35),transparent)]"
          />
          <div aria-hidden className="anim-aurora-a absolute -left-24 top-24 size-96 rounded-full bg-blue-600/25 blur-3xl" />
          <div aria-hidden className="anim-aurora-b absolute -right-24 top-40 size-96 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-20 text-center sm:px-8 sm:pt-28">
            <p
              className="anim-fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-300 backdrop-blur"
              style={delay(100)}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
              </span>
              Workforce and company operations
            </p>

            <h1
              className="anim-fade-up mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl"
              style={delay(220)}
            >
              One place to see{" "}
              <span className="text-shimmer bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                what is happening
              </span>{" "}
              in your company.
            </h1>

            <p
              className="anim-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
              style={delay(360)}
            >
              Attendance, leave and everyday work in a single view, so managers know who is in, what needs
              approving and what is outstanding, and employees know exactly what to do today.
            </p>

            <div
              className="anim-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={delay(500)}
            >
              <Link href="/signup" className={ctaPrimary}>
                Create your account
                <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className={ctaSecondary}>
                Sign in
              </Link>
            </div>

            <DashboardPreview />
          </div>
        </section>

        {/* Capability strip */}
        <div
          aria-hidden
          className="marquee overflow-hidden border-b border-slate-200 bg-white py-5 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-12 pr-12">
                {capabilities.map((item) => (
                  <span key={item} className="flex items-center gap-12 text-sm font-medium text-slate-500">
                    {item}
                    <span className="size-1 rotate-45 bg-blue-500/60" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24 sm:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The everyday essentials, done properly.
            </h2>
            <p className="mt-4 text-slate-600">
              Workeva covers the foundations of running a team, so the information you rely on is accurate.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={(i % 3) * 90 + Math.floor(i / 3) * 60} className="h-full">
                <SpotlightCard className="h-full rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/5">
                  <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600 transition duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 bg-slate-50 py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">How it works</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                From sign-up to a working day in three steps.
              </h2>
            </Reveal>

            <div className="relative mt-14">
              {/* Connector line, drawn on scroll */}
              <Reveal
                variant="draw"
                delay={300}
                className="absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 md:block"
              />
              <ol className="relative grid gap-8 md:grid-cols-3">
                {steps.map(([title, description], i) => (
                  <Reveal key={title} as="li" delay={i * 140}>
                    <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
                      <span className="grid size-10 place-items-center rounded-full bg-violet-50 text-sm font-semibold text-violet-600 ring-4 ring-white">
                        0{i + 1}
                      </span>
                      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Security</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your company&apos;s data stays your company&apos;s.
              </h2>
              <p className="mt-4 text-slate-600">
                Employee records are sensitive. Workeva treats privacy and security as part of the product, not
                an add-on.
              </p>
            </Reveal>

            <ul className="space-y-4">
              {securityPoints.map((item, i) => (
                <Reveal key={item} as="li" variant="right" delay={i * 110}>
                  <div className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition duration-300 hover:border-emerald-200 hover:bg-emerald-50/40">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 transition duration-300 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                      <Check aria-hidden className="size-3.5" />
                    </span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 sm:px-8">
          <Reveal variant="scale">
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy-950 px-6 py-16 text-center sm:px-12">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgba(124,58,237,0.35),transparent)]"
              />
              <div aria-hidden className="anim-aurora-a absolute -left-16 -top-16 size-72 rounded-full bg-blue-600/25 blur-3xl" />
              <div aria-hidden className="anim-aurora-b absolute -bottom-20 -right-10 size-72 rounded-full bg-violet-600/25 blur-3xl" />

              <div className="relative">
                <ShieldCheck aria-hidden className="anim-float mx-auto size-8 text-cyan-400" />
                <h2 className="mx-auto mt-5 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Ready to see what is happening in your company?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-slate-300">
                  Create your account and set up your company in minutes.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className={ctaPrimary}>
                    Create your account
                    <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link href="/login" className={ctaSecondary}>
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-6 place-items-center rounded bg-navy-950 text-xs font-bold text-white">
              W
            </span>
            <span>© {new Date().getFullYear()} Workeva. All rights reserved.</span>
          </div>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/login" className="transition hover:text-slate-900">Sign in</Link>
            <Link href="/signup" className="transition hover:text-slate-900">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}