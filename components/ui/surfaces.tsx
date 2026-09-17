"use client";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

// ---------- Card ----------

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[--radius-card] border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

// ---------- Badge ----------

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-success-50 text-success-700 ring-success-600/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-600/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-600/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * A status with both a colour and a shape, so the meaning survives for a reader
 * who cannot distinguish the colours.
 */
export function StatusDot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  const dot: Record<Tone, string> = {
    neutral: "bg-slate-400",
    info: "bg-brand-600",
    success: "bg-success-600",
    warning: "bg-warning-600",
    danger: "bg-danger-600",
  };

  return <span aria-hidden className={cn("inline-block size-1.5 rounded-full", dot[tone], className)} />;
}

// ---------- Avatar ----------

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-14 text-base",
  };

  if (src) {
    return (
      // A plain img: avatar URLs come from arbitrary hosts, and configuring
      // next/image remote patterns for all of them buys nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-slate-200", sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-navy-800 font-semibold text-white",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// ---------- Stat ----------

export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
  icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const accent: Record<Tone, string> = {
    neutral: "text-slate-900",
    info: "text-brand-700",
    success: "text-success-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={cn("mt-1.5 text-2xl font-semibold numeric", accent[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </>
  );

  const className = cn(
    "rounded-[--radius-card] border border-slate-200 bg-white p-4 shadow-sm",
    href && "transition-colors hover:border-slate-300 hover:bg-slate-50",
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

// ---------- Alert ----------

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const styles: Record<Tone, string> = {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    info: "border-brand-200 bg-brand-50 text-brand-700",
    success: "border-success-600/20 bg-success-50 text-success-700",
    warning: "border-warning-600/20 bg-warning-50 text-warning-700",
    danger: "border-danger-600/20 bg-danger-50 text-danger-700",
  };

  return (
    <div
      className={cn("rounded-md border px-4 py-3 text-sm", styles[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-0.5")}>{children}</div>
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
