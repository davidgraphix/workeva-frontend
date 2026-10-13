import Link from "next/link";
import { Building2, CalendarCheck, CheckCircle2, MapPin, ScrollText, ShieldCheck } from "lucide-react";

const points = [
  { icon: MapPin, title: "Location-aware attendance", text: "Clock in from the office, verified against your work locations." },
  { icon: CalendarCheck, title: "Leave that adds up", text: "Requests, balances and approvals, with the arithmetic done for you." },
  { icon: ScrollText, title: "A record you can trust", text: "Every consequential action is written to an audit trail." },
];

/**
 * The signed-out frame. On large screens it fills exactly one viewport: the form
 * on the right, a product panel on the left. On phones it is a single column.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      {/* Form column: right on large screens */}
      <div className="flex min-h-0 flex-col bg-white px-5 py-6 sm:px-10 lg:order-2 lg:py-7">
        <div className="flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-navy-950 text-sm font-bold text-white transition-transform duration-300 group-hover:rotate-6"
            >
              W
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">Workeva</span>
          </Link>
          <Link href="/" className="text-xs font-medium text-slate-500 transition hover:text-slate-900">
            ← Back to home
          </Link>
        </div>

        {/* my-auto centres short pages; tall content scrolls inside instead of being cut off */}
        <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto py-6">
          <div className="my-auto w-full max-w-lg self-center">{children}</div>
        </main>

        <p className="text-center text-xs text-slate-500">Workeva — workforce and company operations</p>
      </div>

      {/* Info panel: left on large screens */}
      <aside className="relative hidden overflow-hidden bg-navy-950 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="anim-grid absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        <div aria-hidden className="anim-aurora-a absolute -left-24 top-10 size-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div aria-hidden className="anim-aurora-b absolute -bottom-24 -right-16 size-96 rounded-full bg-violet-600/20 blur-3xl" />

        <p className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
          </span>
          Workforce and company operations
        </p>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-white xl:text-4xl">
            One place to see{" "}
            <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
              what is happening
            </span>{" "}
            in your company.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Attendance, leave and everyday work in a single view, so managers know who is in, what needs
            approving and what is outstanding.
          </p>

          <ul className="mt-5 space-y-4">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-300">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

     

        <p className="relative mt-2 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck aria-hidden className="size-4 text-slate-500" />
          <Building2 aria-hidden className="hidden" />
          Each company&apos;s data is isolated and protected by role-based access.
        </p>
      </aside>
    </div>
  );
}