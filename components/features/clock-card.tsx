"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, MapPin, AlertTriangle } from "lucide-react";

import { useAttendanceToday, useClockIn, useClockOut } from "@/hooks/use-workeva";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surfaces";
import { AttendanceStatusBadge } from "@/components/ui/status";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { formatDuration, formatTime, formatTimeOfDay } from "@/lib/format";
import { LocationError, requestLocation } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

/**
 * The clock-in card.
 *
 * It answers four questions at a glance: what is my status, what time is it for
 * my company, can I clock in, and if not, why not. It shows "Clocked in" only
 * after the API has confirmed the record - never optimistically - and each step
 * (finding location, recording) is announced so a slow network doesn't look like
 * a frozen button.
 */
export function ClockCard() {
  const today = useAttendanceToday();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const now = useNow();

  const data = today.data;

  async function run(action: "in" | "out") {
    if (!data) return;
    setPhase({ kind: "locating" });

    let coordinates: { latitude: number | null; longitude: number | null; accuracyMeters: number | null } = {
      latitude: null,
      longitude: null,
      accuracyMeters: null,
    };

    // Location is only requested when the company requires it, and only at the
    // moment of clocking - never in the background.
    if (data.locationRequired) {
      try {
        coordinates = await requestLocation();
      } catch (error) {
        setPhase({
          kind: "error",
          message: error instanceof LocationError ? error.message : "We couldn't read your location.",
        });
        return;
      }
    }

    setPhase({ kind: "submitting" });

    try {
      const mutation = action === "in" ? clockIn : clockOut;
      const record = await mutation.mutateAsync(coordinates);
      setPhase({ kind: "idle" });
      toast.success(
        action === "in" ? "Attendance recorded" : "Clocked out",
        action === "in"
          ? `Clocked in at ${formatTime(record.clockInAt, data.timezone)}${record.clockInLocationName ? ` · ${record.clockInLocationName}` : ""}`
          : `You worked ${formatDuration(record.workedMinutes)} today.`,
      );
    } catch (error) {
      setPhase({
        kind: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "We couldn't record your attendance. Please try again.",
      });
      // The server is the source of truth; refresh in case the state changed anyway.
      void today.refetch();
    }
  }

  if (today.isLoading) {
    return (
      <Card className="p-5" role="status" aria-label="Loading attendance">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-10 w-24" />
        <Skeleton className="mt-6 h-12 w-full" />
      </Card>
    );
  }

  if (today.error || !data) {
    return (
      <Card>
        <ErrorState error={today.error} onRetry={() => today.refetch()} />
      </Card>
    );
  }

  const busy = phase.kind === "locating" || phase.kind === "submitting";
  const isOpen = Boolean(data.clockInAt && !data.clockOutAt);
  const workedSoFar =
    isOpen && data.clockInAt ? Math.max(0, Math.round((now - new Date(data.clockInAt).getTime()) / 60000)) : data.workedMinutes;

  return (
    <Card className="overflow-hidden">
      <div className="bg-navy-950 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Today</p>
          <AttendanceStatusBadge status={data.status} />
        </div>
        <p className="mt-1 text-3xl font-semibold numeric" aria-live="off">
          {formatTime(new Date(now), data.timezone)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {data.isWorkingDay
            ? `Working hours ${formatTimeOfDay(data.workDayStart)}–${formatTimeOfDay(data.workDayEnd)} · ${data.gracePeriodMinutes} min grace`
            : "Not a scheduled working day"}
        </p>
      </div>

      <div className="space-y-4 p-5">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-slate-500">Clock in</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900 numeric">{formatTime(data.clockInAt, data.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Clock out</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900 numeric">{formatTime(data.clockOutAt, data.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{isOpen ? "Working" : "Worked"}</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900 numeric">{formatDuration(workedSoFar)}</dd>
          </div>
        </dl>

        {data.isLate && (
          <p className="flex items-center gap-1.5 text-xs text-warning-700">
            <Clock aria-hidden className="size-3.5" />
            Arrived {data.lateMinutes} minutes after the start of the day.
          </p>
        )}

        {data.clockInLocationName && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin aria-hidden className="size-3.5" />
            {data.clockInLocationName}
          </p>
        )}

        <div aria-live="polite" className="min-h-5">
          {phase.kind === "locating" && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 aria-hidden className="size-4 animate-spin" /> Checking your location…
            </p>
          )}
          {phase.kind === "submitting" && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 aria-hidden className="size-4 animate-spin" /> Recording your attendance…
            </p>
          )}
          {phase.kind === "error" && (
            <p className="flex items-start gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {phase.message}
            </p>
          )}
          {phase.kind === "idle" && data.blockedReason && (
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
              {data.blockedReason}
            </p>
          )}
        </div>

        {data.canClockIn && (
          <Button size="lg" fullWidth onClick={() => run("in")} loading={busy} className="h-14 text-base">
            {busy ? "Please wait" : "Clock in"}
          </Button>
        )}
        {data.canClockOut && (
          <Button size="lg" variant="secondary" fullWidth onClick={() => run("out")} loading={busy} className="h-14 text-base">
            {busy ? "Please wait" : "Clock out"}
          </Button>
        )}

        {data.locationRequired && (data.canClockIn || data.canClockOut) && (
          <p className="text-center text-xs text-slate-500">
            Your location is checked once, when you tap the button, to confirm you&apos;re at a work location. It isn&apos;t tracked.
          </p>
        )}
      </div>
    </Card>
  );
}

/** A clock that ticks once a minute is all the precision attendance needs. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}
