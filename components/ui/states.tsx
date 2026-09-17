"use client";

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// ---------- Loading ----------

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-skeleton rounded bg-slate-200", className)} />;
}

/** Skeleton shaped like the table it replaces, so the layout does not jump. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-4 flex-1", columnIndex === 0 && "max-w-[40%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-[--radius-card] border border-slate-200 bg-white p-4", className)}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="rounded-[--radius-card] border border-slate-200 bg-white">
        <TableSkeleton />
      </div>
    </div>
  );
}

// ---------- Empty ----------

/**
 * An empty state should say what is missing and what to do about it. A blank
 * panel leaves the reader wondering whether the product is broken.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox aria-hidden className="size-5" />}
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Error ----------

/**
 * Turns a thrown error into something a person can act on. `ApiError.message` is
 * always written for humans; anything else gets a generic message, because an
 * unexpected exception's text is not fit to show.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const apiError = error instanceof ApiError ? error : null;

  const message = apiError
    ? apiError.message
    : "We couldn't load this. Please try again.";

  const canRetry = onRetry && (!apiError || apiError.isRetryable);

  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)} role="alert">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <AlertTriangle aria-hidden className="size-5" />
      </div>
      <p className="text-sm font-semibold text-slate-900">
        {apiError?.isForbidden ? "You don't have access to this" : "Something went wrong"}
      </p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {canRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * The standard body for a data panel: loading, then error, then empty, then
 * content. Having one component decide the order stops screens from disagreeing
 * about what to show when.
 */
export function QueryBoundary<T>({
  isLoading,
  error,
  data,
  onRetry,
  loadingFallback,
  emptyState,
  isEmpty,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => React.ReactNode;
}) {
  if (isLoading) return <>{loadingFallback ?? <TableSkeleton />}</>;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (data === undefined) return <>{emptyState ?? <EmptyState title="Nothing to show" />}</>;
  if (isEmpty?.(data)) return <>{emptyState ?? <EmptyState title="Nothing to show" />}</>;

  return <>{children(data)}</>;
}
