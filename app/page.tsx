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

const stats = [
  ["Present", "64", "text-emerald-600"],
  ["Late", "7", "text-amber-600"],
  ["On leave", "3", "text-sky-600"],
  ["Absent", "11", "text-red-600"],
];

const activity = [
  ["David clocked in", "Head Office · 10:38 AM", "bg-emerald-500"],
  [
    "Sarah requested annual leave",
    "Awaiting approval · 10:42 AM",
    "bg-amber-500",
  ],
  ["Michael marked late", "Head Office · 10:47 AM", "bg-amber-500"],
  ["Task assigned to Grace", "Prepare sales report · 11:03 AM", "bg-blue-500"],
];

const ctaPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";
const ctaSecondary =
  "inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded bg-navy-950 text-sm font-bold text-white"
            >
              W
            </span>
            <span className="text-base font-semibold text-white">Workeva</span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-8 text-sm text-slate-300 md:flex"
          >
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#security" className="transition hover:text-white">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm bg-navy-950 font-medium text-slate-200 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-950 transition hover:bg-slate-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-950">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(37,99,235,0.35),transparent)]"
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-20 text-center sm:px-8 sm:pt-28">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-300">
              <span className="size-1.5 rounded-full bg-cyan-400" />
              Workforce and company operations
            </p>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
              One place to see what is happening in your company.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Attendance, leave and everyday work in a single view, so managers
              know who is in, what needs approving and what is outstanding, and
              employees know exactly what to do today.
            </p>

            <div className="mt-10 flex flex-col  items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={ctaPrimary}>
                Create your account{" "}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link href="/login" className={ctaSecondary}>
                Sign in
              </Link>
            </div>

            {/* Product preview (sample data) */}
            <div className="relative mx-auto mt-16 max-w-4xl">
              <div
                aria-hidden
                className="absolute -inset-x-6 -top-6 h-40 rounded-full bg-violet-600/20 blur-3xl"
              />
              <div className="relative rounded-t-2xl border border-white/10 bg-white/5 p-2 sm:p-3">
                <div className="rounded-t-xl bg-slate-50 p-4 text-left sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Today
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        Company overview
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Sample data
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map(([label, value, color]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className={`mt-1 text-2xl font-semibold ${color}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Recent activity
                    </p>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {activity.map(([title, meta, dot]) => (
                        <li
                          key={title}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <span
                            aria-hidden
                            className={`size-2 shrink-0 rounded-full ${dot}`}
                          />
                          <span className="flex-1 truncate text-sm text-slate-800">
                            {title}
                          </span>
                          <span className="hidden text-xs text-slate-500 sm:block">
                            {meta}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24 sm:px-8"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The everyday essentials, done properly.
            </h2>
            <p className="mt-4 text-slate-600">
              Workeva covers the foundations of running a team, so the
              information you rely on is accurate.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white p-7 transition hover:bg-slate-50"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 bg-slate-50 py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              From sign-up to a working day in three steps.
            </h2>

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {steps.map(([title, description], i) => (
                <li
                  key={title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-7"
                >
                  <span className="text-sm font-semibold text-violet-600">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="mx-auto max-w-6xl scroll-mt-16 px-5 py-24 sm:px-8"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Security
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your company&apos;s data stays your company&apos;s.
              </h2>
              <p className="mt-4 text-slate-600">
                Employee records are sensitive. Workeva treats privacy and
                security as part of the product, not an add-on.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                "Each company is fully isolated from every other company.",
                "Role-based access, so people only see what their role allows.",
                "Permissions enforced on the server, not just in the interface.",
                "An audit log of important actions across your organization.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                  <span className="text-sm text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 sm:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy-950 px-6 py-16 text-center sm:px-12">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgba(124,58,237,0.35),transparent)]"
            />
            <div className="relative">
              <ShieldCheck
                aria-hidden
                className="mx-auto size-8 text-cyan-400"
              />
              <h2 className="mx-auto mt-5 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to see what is happening in your company?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-300">
                Create your account and set up your company in minutes.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup" className={ctaPrimary}>
                  Create your account{" "}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link href="/login" className={ctaSecondary}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded bg-navy-950 text-xs font-bold text-white"
            >
              W
            </span>
            <span>
              © {new Date().getFullYear()} Workeva. All rights reserved.
            </span>
          </div>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/login" className="hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-slate-900">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
