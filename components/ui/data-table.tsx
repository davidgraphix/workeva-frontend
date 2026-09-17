"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Tables on a phone.
 *
 * Rather than shrinking a desktop table until it is unreadable, each row is
 * rendered twice from the same data: as a table row on `md` and above, and as a
 * card below it. The card layout is supplied per screen, because what matters on
 * a small screen differs from what fits on a large one.
 */
export interface Column<T> {
  key: string;
  header: string;
  /** Hidden on narrow desktop widths when the column is secondary. */
  hideBelow?: "lg" | "xl";
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  renderMobileRow,
  onRowClick,
  caption,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** The card body for narrow screens. */
  renderMobileRow: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  caption?: string;
  className?: string;
}) {
  const hideClasses = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" };

  return (
    <div className={className}>
      {/* Desktop and tablet */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    column.align === "right" ? "text-right" : "text-left",
                    column.hideBelow && hideClasses[column.hideBelow],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-slate-100 last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-slate-50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-slate-700 align-middle",
                      column.align === "right" && "text-right",
                      column.hideBelow && hideClasses[column.hideBelow],
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                {renderMobileRow(row)}
              </button>
            ) : (
              <div className="px-4 py-3">{renderMobileRow(row)}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalCount === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs text-slate-500 numeric">
        Showing <span className="font-medium text-slate-700">{first}</span>–
        <span className="font-medium text-slate-700">{last}</span> of{" "}
        <span className="font-medium text-slate-700">{totalCount}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="text-xs text-slate-500 numeric" aria-current="page">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
