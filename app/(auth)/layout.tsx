import Link from "next/link";

/**
 * The signed-out frame. One column on a phone; a split layout on large screens
 * where the right-hand panel says what the product is for, because a sign-in
 * page is often the first thing a pilot company's staff ever see.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/login" className="mb-10 inline-flex items-center gap-2.5 self-start">
          <span aria-hidden className="grid size-8 place-items-center rounded bg-navy-950 text-sm font-bold text-white">
            W
          </span>
          <span className="text-base font-semibold text-slate-900">Workeva</span>
        </Link>

        <main id="main" className="flex flex-1 items-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <p className="mt-10 text-xs text-slate-400">
          Workeva — workforce and company operations
        </p>
      </div>

      <aside className="hidden bg-navy-950 p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Workeva</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white">
            One place to see what is happening in your company.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Attendance, leave and everyday work in a single view — so managers know
            who is in, what needs approving and what is outstanding, and employees
            know exactly what to do today.
          </p>

          <dl className="mt-10 space-y-5">
            {[
              ["Location-aware attendance", "Clock in and out from the office, verified against your work locations."],
              ["Leave that adds up", "Requests, balances and approvals, with the arithmetic done for you."],
              ["A record you can trust", "Every consequential action is written to an audit trail."],
            ].map(([title, description]) => (
              <div key={title}>
                <dt className="text-sm font-medium text-white">{title}</dt>
                <dd className="mt-0.5 text-sm text-slate-400">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
