import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";

/**
 * Display helpers.
 *
 * Instants arrive from the API in UTC and are rendered in the organization's
 * timezone, not the browser's - an administrator in London looking at a Lagos
 * office should see Lagos times.
 */

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** A time of day in the organization's timezone, e.g. "08:38". */
export function formatTime(value: string | Date | null | undefined, timezone?: string): string {
  if (!value) return "—";

  const date = toDate(value);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

/** A date in the organization's timezone, e.g. "14 Sep 2026". */
export function formatDate(value: string | Date | null | undefined, timezone?: string): string {
  if (!value) return "—";

  const date = toDate(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, timezone?: string): string {
  if (!value) return "—";
  return `${formatDate(value, timezone)}, ${formatTime(value, timezone)}`;
}

/** A plain date string from the API (yyyy-MM-dd), which carries no timezone. */
export function formatPlainDate(value: string | null | undefined): string {
  if (!value) return "—";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  const [year, month, day] = parts.map(Number) as [number, number, number];
  return format(new Date(year, month - 1, day), "d MMM yyyy");
}

/** "Today", "Yesterday", or a date. Used where recency matters more than precision. */
export function formatRelativeDay(value: string | null | undefined): string {
  if (!value) return "—";

  const date = toDate(value);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM yyyy");
}

/** "3 minutes ago". For activity feeds and notification lists. */
export function formatAgo(value: string | null | undefined): string {
  if (!value) return "";
  return `${formatDistanceToNowStrict(toDate(value))} ago`;
}

/** Minutes as "8h 54m". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

/** A "HH:mm:ss" time-of-day string from the API, shown as "08:00". */
export function formatTimeOfDay(value: string | null | undefined): string {
  if (!value) return "—";
  const [hours, minutes] = value.split(":");
  return `${hours ?? "00"}:${minutes ?? "00"}`;
}

/** Days, without a trailing ".0" when it is a whole number. */
export function formatDays(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}${rounded === 1 ? " day" : " days"}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** Initials for an avatar fallback, from a full name. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();

  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

/** The working-days bitmask, as a readable list. Monday is bit 0. */
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatWorkingDays(mask: number): string {
  const days = DAY_NAMES.filter((_, index) => (mask & (1 << index)) !== 0);
  if (days.length === 0) return "No working days set";
  if (days.length === 7) return "Every day";

  // Collapse a contiguous run into "Mon–Fri".
  const indices = DAY_NAMES.map((_, i) => i).filter((i) => (mask & (1 << i)) !== 0);
  const isContiguous = indices.every((value, index) => index === 0 || value === (indices[index - 1] ?? 0) + 1);

  if (isContiguous && days.length > 2) return `${days[0]}–${days[days.length - 1]}`;
  return days.join(", ");
}

export function toggleDayInMask(mask: number, dayIndex: number): number {
  return mask ^ (1 << dayIndex);
}

export function isDayInMask(mask: number, dayIndex: number): boolean {
  return (mask & (1 << dayIndex)) !== 0;
}

export const dayLabels = DAY_NAMES;

/** Today's date as yyyy-MM-dd, for date inputs and query defaults. */
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}
