import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  MapPin,
  ScrollText,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Plus,
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
    description:
      "Staff clock in and out from the office, verified against the work locations you define.",
  },
  {
    icon: CalendarCheck,
    title: "Leave that adds up",
    description:
      "Requests, balances and approvals in one flow, with the arithmetic done for you.",
  },
  {
    icon: ListChecks,
    title: "Everyday tasks",
    description:
      "Assign work, set priorities and deadlines, and see what is overdue at a glance.",
  },
  {
    icon: Users,
    title: "People and departments",
    description:
      "A searchable directory with profiles, roles and managers for every team.",
  },
  {
    icon: Bell,
    title: "Notifications that matter",
    description:
      "Managers hear about clock-ins, leave requests and new tasks as they happen.",
  },
  {
    icon: ScrollText,
    title: "A record you can trust",
    description: "Every consequential action is written to an audit trail.",
  },
];

const roles: {
  icon: LucideIcon;
  title: string;
  question: string;
  points: string[];
}[] = [
  {
    icon: Building2,
    title: "Owners and admins",
    question: "Is my company running properly?",
    points: [
      "Company-wide dashboard",
      "Locations, hours and leave rules",
      "Reports and CSV export",
    ],
  },
  {
    icon: UserCog,
    title: "HR",
    question: "What needs attention today?",
    points: [
      "Employee records and invitations",
      "Attendance and leave oversight",
      "Departments and roles",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Managers",
    question: "What is happening with my team?",
    points: [
      "Team attendance at a glance",
      "Approve or reject leave",
      "Assign and track tasks",
    ],
  },
  {
    icon: Smartphone,
    title: "Employees",
    question: "What do I need to do today?",
    points: [
      "One-tap clock in and out",
      "Tasks, leave and balances",
      "Notifications on approvals",
    ],
  },
];

const steps = [
  [
    "Set up your company",
    "Create your organization, add your office location and set working hours.",
  ],
  [
    "Invite your team",
    "Add departments and invite employees by email. They set up their own accounts.",
  ],
  [
    "Run your day",
    "Attendance, leave and tasks flow into one dashboard that shows what needs attention.",
  ],
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

const mobilePoints = [
  "Clock in only from inside your work location",
  "See today's tasks and your leave balance",
  "Get notified the moment a request is approved",
  "Works in your phone's browser, with nothing to install",
];

const faqs = [
  [
    "How does location-based attendance work?",
    "You set one or more work locations with an allowed radius. When an employee clocks in, Workeva checks their position against that radius and tells them clearly if they are outside it. Timestamps come from the server, not the phone's clock.",
  ],
  [
    "Can managers see everything about everyone?",
    "No. Access follows roles. Managers see the people and information their role permits, and employees see only their own records.",
  ],
  [
    "Is our data kept separate from other companies?",
    "Yes. Every company is its own organization, and its data is isolated from every other company at the database and server level, not just in the interface.",
  ],
  [
    "Does it work on phones?",
    "Yes. Workeva is built to work well in a mobile browser, because employees will mostly clock in from their phones.",
  ],
  [
    "Can I export reports?",
    "Attendance, leave and task reports can be exported as CSV.",
  ],
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const ctaPrimary =
  "btn-shine group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/40 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";
const ctaSecondary =
  "inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const eyebrow = "text-xs font-semibold uppercase tracking-widest text-blue-600";

/** A phone showing the employee's clock-in screen (sample data). */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px]">
      <div
        aria-hidden
        className="absolute -inset-10 rounded-full bg-blue-600/25 blur-3xl"
      />
      <div className="anim-float relative rounded-[2.5rem] border border-white/15 bg-slate-900 p-2.5 shadow-2xl shadow-black/40">
        <div className="overflow-hidden rounded-[2rem] bg-slate-50">
          <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-slate-900" />

          <div className="px-4 pb-5 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Good morning
            </p>
            <p className="text-base font-semibold text-slate-900">David</p>

            <div className="mt-3 rounded-2xl bg-navy-950 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Clocked in
                </span>
                <span className="text-[11px] text-slate-400">Sample data</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                8:38 AM
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
                <MapPin aria-hidden className="size-3 text-cyan-300" />
                Verified · within Head Office radius
              </p>
              <div className="mt-4 rounded-lg bg-white/10 py-2 text-center text-xs font-semibold">
                Clock out
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Tasks today</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">3</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Leave left</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  13 days
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Leave approved
                </p>
                <p className="text-[11px] text-slate-500">Sep 20 – Sep 23</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <div
            aria-hidden
            className="anim-aurora-a absolute -left-24 top-24 size-96 rounded-full bg-blue-600/25 blur-3xl"
          />
          <div
            aria-hidden
            className="anim-aurora-b absolute -right-24 top-40 size-96 rounded-full bg-violet-600/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-28 text-center sm:px-8 sm:pt-32">
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
              className="anim-fade-up mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl"
              style={delay(220)}
            >
              One place to see{" "}
              <span className="text-shimmer bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                what is happening
              </span>{" "}
              in your company.
            </h1>

            <p
              className="anim-fade-up mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
              style={delay(360)}
            >
              Attendance, leave and everyday work in a single view, so managers
              know who is in, what needs approving and what is outstanding, and
              employees know exactly what to do today.
            </p>

            <div
              className="anim-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={delay(500)}
            >
              <Link href="/signup" className={ctaPrimary}>
                Create your account
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                />
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
          className="marquee overflow-hidden border-b border-slate-200 bg-white py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-12 pr-12"
              >
                {capabilities.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-12 text-sm font-medium text-slate-500"
                  >
                    {item}
                    <span className="size-1 rotate-45 bg-blue-500/60" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <section
          id="features"
          className="relative scroll-mt-24 overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:24px_24px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <Reveal className="max-w-2xl">
              <p className={eyebrow}>Features</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                The everyday essentials, done properly.
              </h2>
              <p className="mt-3 text-slate-600">
                Workeva covers the foundations of running a team, so the
                information you rely on is accurate.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, i) => (
                <Reveal
                  key={title}
                  delay={(i % 3) * 90 + Math.floor(i / 3) * 60}
                  className="h-full"
                >
                  <SpotlightCard className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/5">
                    <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600 transition duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {description}
                    </p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section
          id="roles"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className={eyebrow}>Built for every role</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everyone opens Workeva with a different question.
              </h2>
              <p className="mt-3 text-slate-600">
                Each person lands on what matters to them, and sees only what
                their role allows.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map(({ icon: Icon, title, question, points }, i) => (
                <Reveal key={title} delay={i * 90} className="h-full">
                  <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-slate-900/5">
                    <span className="grid size-10 place-items-center rounded-lg bg-violet-50 text-violet-600 transition duration-300 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-sm italic text-slate-500">
                      &ldquo;{question}&rdquo;
                    </p>
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <Check
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0 text-emerald-600"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Employee mobile experience */}
        <section className="relative overflow-hidden bg-navy-950">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(50%_70%_at_80%_50%,rgba(37,99,235,0.22),transparent)]"
          />
          <div
            aria-hidden
            className="anim-aurora-b absolute -left-20 bottom-0 size-80 rounded-full bg-violet-600/15 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                For your team
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Clocking in takes one tap, from anywhere on site.
              </h2>
              <p className="mt-3 max-w-lg text-slate-300">
                Employees get a simple home screen that answers what they need
                to know first: am I clocked in, and what is on my plate today.
              </p>

              <ul className="mt-7 space-y-3">
                {mobilePoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-slate-200"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-cyan-300">
                      <Check aria-hidden className="size-3.5" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <Link href="/signup" className={`${ctaPrimary} mt-8`}>
                Get started
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </Reveal>

            <Reveal variant="scale" delay={150}>
              <PhoneMockup />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <Reveal>
              <p className={eyebrow}>How it works</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                From sign-up to a working day in three steps.
              </h2>
            </Reveal>

            <div className="relative mt-10">
              {/* Connector line, drawn on scroll */}
              <Reveal
                variant="draw"
                delay={300}
                className="absolute left-[16%] right-[16%] top-11 hidden h-px bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 md:block"
              />
              <ol className="relative grid gap-5 md:grid-cols-3">
                {steps.map(([title, description], i) => (
                  <Reveal key={title} as="li" delay={i * 140}>
                    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
                      <span className="grid size-10 place-items-center rounded-full bg-violet-50 text-sm font-semibold text-violet-600 ring-4 ring-white">
                        0{i + 1}
                      </span>
                      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {description}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <Reveal>
              <p className={eyebrow}>Security</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your company&apos;s data stays your company&apos;s.
              </h2>
              <p className="mt-3 text-slate-600">
                Employee records are sensitive. Workeva treats privacy and
                security as part of the product, not an add-on.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
                <ShieldCheck aria-hidden className="size-4" />
                Isolation enforced at the database and server level
              </div>
            </Reveal>

            <ul className="space-y-3">
              {securityPoints.map((item, i) => (
                <Reveal key={item} as="li" variant="right" delay={i * 110}>
                  <div className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition duration-300 hover:border-emerald-200 hover:bg-emerald-50/40">
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

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-24 border-t border-slate-200 bg-white"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-5 lg:gap-16">
            {/* Left: heading */}
            <Reveal className="lg:col-span-2">
              <div className="lg:sticky lg:top-28">
                <p className={eyebrow}>FAQ</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Common questions
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
                  Straight answers about attendance, access and how your
                  company&apos;s data is handled.
                </p>
              </div>
            </Reveal>

            {/* Right: one panel, divided rows */}
            <Reveal className="lg:col-span-3" delay={120}>
              <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
                {faqs.map(([question, answer], i) => (
                  <details
                    key={question}
                    className="group border-l-2 border-transparent transition-colors duration-300 open:border-blue-600 open:bg-slate-50/70"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:gap-5 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                      <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-slate-400 transition-colors duration-300 group-open:text-blue-600">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-base font-semibold text-slate-900">
                        {question}
                      </span>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition duration-300 group-hover:border-slate-300 group-open:rotate-45 group-open:border-blue-600 group-open:bg-blue-600 group-open:text-white">
                        <Plus aria-hidden className="size-4" />
                      </span>
                    </summary>

                    <p className="pb-6 pl-[3.25rem] pr-6 text-sm leading-relaxed text-slate-600 group-open:animate-[fade-up_0.45s_ease-out_both] sm:pl-[4.25rem] sm:pr-16 sm:text-[15px]">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <Reveal variant="scale">
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy-950 px-6 py-14 text-center sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgba(124,58,237,0.4),transparent)]"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
              />
              <div
                aria-hidden
                className="anim-aurora-a absolute -left-16 -top-16 size-72 rounded-full bg-blue-600/25 blur-3xl"
              />
              <div
                aria-hidden
                className="anim-aurora-b absolute -bottom-20 -right-10 size-72 rounded-full bg-violet-600/25 blur-3xl"
              />

              <div className="relative">
                <span className="anim-float mx-auto grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur">
                  <ShieldCheck aria-hidden className="size-6 text-cyan-400" />
                </span>
                <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  Ready to see what is happening in your company?
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-300">
                  Create your account and set up your company in minutes.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className={ctaPrimary}>
                    Create your account
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                    />
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
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded bg-navy-950 text-sm font-bold text-white"
                >
                  W
                </span>
                <span className="text-base font-semibold text-slate-900">
                  Workeva
                </span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
                Attendance, leave and everyday work in a single view, so
                managers always know what needs attention.
              </p>
            </div>

            <nav aria-label="Product">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Product
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li>
                  <a
                    href="#features"
                    className="transition hover:text-slate-900"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a href="#roles" className="transition hover:text-slate-900">
                    Roles
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="transition hover:text-slate-900"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#security"
                    className="transition hover:text-slate-900"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition hover:text-slate-900">
                    FAQ
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Account">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Account
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link
                    href="/login"
                    className="transition hover:text-slate-900"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="transition hover:text-slate-900"
                  >
                    Create account
                  </Link>
                </li>
                <li>
                  <Link
                    href="/forgot-password"
                    className="transition hover:text-slate-900"
                  >
                    Forgot password
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
            <span>
              © {new Date().getFullYear()} Workeva. All rights reserved.
            </span>
            <span>Workforce and company operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
