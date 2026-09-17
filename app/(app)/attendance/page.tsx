"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { ActivityFeed } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardHeader, StatCard } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { AttendanceStatusBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { useCsvDownload } from "@/hooks/use-api";
import { useAttendance, useAttendanceActivity, useAttendanceSummary, useDepartments, useSuspiciousEvents } from "@/hooks/use-workeva";
import { ApiError, query } from "@/lib/api";
import { formatDateTime, formatDuration, formatPlainDate, formatTime, isoDaysFromNow, todayIso } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { AttendanceStatus, attendanceStatusLabels } from "@/lib/types";
import { cn } from "@/lib/utils";

function AttendanceContent() {
  const { can, me } = useSession();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"records" | "review">(searchParams.get("tab") === "review" ? "review" : "records");
  const timezone = me?.active?.timezone;

  if (!can(Permission.attendanceView)) return <NoAccess />;

  return (
    <>
      <PageHeader title="Attendance" description="Who is in today, and the full attendance record." />
      <TodayOverview timezone={timezone} />

      {can(Permission.attendanceManage) && (
        <div role="tablist" aria-label="Attendance views" className="mb-4 flex gap-1 border-b border-slate-200">
          {([["records", "Records"], ["review", "Needs review"]] as const).map(([key, label]) => (
            <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)}
              className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "records" ? <Records timezone={timezone} /> : <Review timezone={timezone} />}
    </>
  );
}

function TodayOverview({ timezone }: { timezone?: string }) {
  const summary = useAttendanceSummary();
  const activity = useAttendanceActivity(10);

  return (
    <div className="mb-5 grid gap-5 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:col-span-2">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Present" value={summary.data.present} tone="success" />
            <StatCard label="Late" value={summary.data.late} tone="warning" />
            <StatCard label="Not checked in" value={summary.data.notCheckedIn} tone={summary.data.notCheckedIn && summary.data.isWorkingDay ? "danger" : "neutral"} />
            <StatCard label="On leave" value={summary.data.onLeave} />
            <StatCard label="Working now" value={summary.data.currentlyWorking} tone="info" />
            <StatCard label="Checked out" value={summary.data.checkedOut} />
          </>
        )}
      </div>
      <Card>
        <CardHeader title="Live activity" description="Events, not locations" />
        <QueryBoundary isLoading={activity.isLoading} error={activity.error} data={activity.data} onRetry={() => activity.refetch()}>
          {(data) => <ActivityFeed items={data} timezone={timezone} />}
        </QueryBoundary>
      </Card>
    </div>
  );
}

function Records({ timezone }: { timezone?: string }) {
  const { can } = useSession();
  const departments = useDepartments();
  const download = useCsvDownload();
  const toast = useToast();
  const [from, setFrom] = useState(isoDaysFromNow(-6));
  const [to, setTo] = useState(todayIso());
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const records = useAttendance({
    from, to, departmentId: departmentId || undefined, status: status === "" ? undefined : Number(status), page, pageSize: 25,
  });

  return (
    <Card>
      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 md:grid-cols-5 md:items-end">
        <Input label="From" type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <Input label="To" type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <Select label="Department" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any</option>
          {[AttendanceStatus.Present, AttendanceStatus.Late, AttendanceStatus.CheckedOut].map((s) => <option key={s} value={s}>{attendanceStatusLabels[s]}</option>)}
        </Select>
        {can(Permission.reportsView) && (
          <Button variant="secondary" className="col-span-2 md:col-span-1" loading={exporting} onClick={async () => {
            setExporting(true);
            try {
              await download(`/api/reports/attendance.csv${query({ from, to, departmentId: departmentId || undefined })}`);
            } catch (error) {
              toast.error("Export failed", error instanceof ApiError ? error.message : undefined);
            } finally {
              setExporting(false);
            }
          }}>
            <Download aria-hidden className="size-4" /> Export CSV
          </Button>
        )}
      </div>

      <QueryBoundary isLoading={records.isLoading} error={records.error} data={records.data} onRetry={() => records.refetch()}
        isEmpty={(d) => d.items.length === 0}
        emptyState={<EmptyState title="No attendance in this range" description="Try widening the dates or clearing the filters." />}>
        {(data) => (
          <>
            <DataTable
              caption="Attendance records"
              rows={data.items}
              getRowKey={(r) => r.id}
              columns={[
                { key: "who", header: "Employee", render: (r) => (
                  <div><p className="font-medium text-slate-900">{r.employeeName}</p><p className="text-xs text-slate-500">{r.departmentName ?? "—"}</p></div>
                ) },
                { key: "date", header: "Date", render: (r) => formatPlainDate(r.workDate) },
                { key: "status", header: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
                { key: "in", header: "In", render: (r) => <span className="numeric">{formatTime(r.clockInAt, timezone)}{r.isLate && <span className="ml-1 text-xs text-warning-700">+{r.lateMinutes}m</span>}</span> },
                { key: "out", header: "Out", render: (r) => <span className="numeric">{formatTime(r.clockOutAt, timezone)}</span> },
                { key: "worked", header: "Worked", align: "right", render: (r) => <span className="numeric">{formatDuration(r.workedMinutes)}</span> },
                { key: "loc", header: "Location", hideBelow: "xl", render: (r) => r.clockInLocationName ?? "—" },
              ]}
              renderMobileRow={(r) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{r.employeeName}</p>
                    <p className="text-xs text-slate-500 numeric">{formatPlainDate(r.workDate)} · {formatTime(r.clockInAt, timezone)}–{formatTime(r.clockOutAt, timezone)}</p>
                  </div>
                  <AttendanceStatusBadge status={r.status} />
                </div>
              )}
            />
            <Pagination {...data} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
    </Card>
  );
}

function Review({ timezone }: { timezone?: string }) {
  const [page, setPage] = useState(1);
  const events = useSuspiciousEvents(page);

  return (
    <Card>
      <CardHeader title="Suspicious attendance events"
        description="Attempts that looked unusual. A flag is a prompt to check in with someone, not a finding against them." />
      <QueryBoundary isLoading={events.isLoading} error={events.error} data={events.data} onRetry={() => events.refetch()}
        isEmpty={(d) => d.items.length === 0}
        emptyState={<EmptyState icon={<ShieldAlert aria-hidden className="size-5" />} title="Nothing to review" description="Unusual attendance attempts will be listed here." />}>
        {(data) => (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((e) => (
                <li key={e.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{e.employeeName}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(e.occurredAt, timezone)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{e.suspicionReason}</p>
                  {e.distanceMeters !== null && (
                    <p className="text-xs text-slate-500">About {e.distanceMeters >= 1000 ? `${(e.distanceMeters / 1000).toFixed(1)} km` : `${Math.round(e.distanceMeters)} m`} from the nearest work location</p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination {...data} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
    </Card>
  );
}

export default function AttendancePage() {
  return <Suspense fallback={null}><AttendanceContent /></Suspense>;
}
