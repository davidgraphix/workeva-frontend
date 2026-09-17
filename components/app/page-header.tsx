export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Wraps a screen that needs a permission. The API still decides; this avoids a page of 403s. */
export function NoAccess() {
  return (
    <div className="rounded-[--radius-card] border border-slate-200 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-900">You don&apos;t have access to this page</p>
      <p className="mt-1 text-sm text-slate-500">Ask your company administrator if you think you should.</p>
    </div>
  );
}
