"use client";

import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, format, isWeekend, parseISO, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { LeaveApprovalList } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { LeaveStatusBadge } from "@/components/ui/status";
import { useLeaveCalendar, useLeaveRequests, useLeaveTypes } from "@/hooks/use-workeva";
import { formatDays, formatPlainDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { LeaveStatus, leaveStatusLabels } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [["approvals", "Awaiting approval"], ["all", "All requests"], ["calendar", "Calendar"]] as const;
type TabKey = (typeof TABS)[number][0];

export default function LeavePage() {
  const { can } = useSession();
  const [tab, setTab] = useState<TabKey>("approvals");

  if (!can(Permission.leaveView)) return <NoAccess />;

  return (
    <>
      <PageHeader title="Leave" description="Approve requests and see who is away." />
      <div role="tablist" aria-label="Leave views" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "approvals" && <Approvals />}
      {tab === "all" && <AllRequests />}
      {tab === "calendar" && <LeaveCalendar />}
    </>
  );
}

function Approvals() {
  const [page, setPage] = useState(1);
  const pending = useLeaveRequests({ status: LeaveStatus.Pending, page, pageSize: 20 });
  return (
    <Card>
      <QueryBoundary isLoading={pending.isLoading} error={pending.error} data={pending.data} onRetry={() => pending.refetch()}>
        {(data) => (
          <>
            <LeaveApprovalList requests={data.items} />
            <Pagination {...data} onPageChange={setPage} />
          </>
        )}
      </QueryBoundary>
    </Card>
  );
}

function AllRequests() {
  const types = useLeaveTypes(false);
  const [status, setStatus] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [page, setPage] = useState(1);
  const requests = useLeaveRequests({
    status: status === "" ? undefined : (Number(status) as LeaveStatus), leaveTypeId: leaveTypeId || undefined, page, pageSize: 20,
  });

  return (
    <Card>
      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 sm:w-96">
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any</option>
          {[LeaveStatus.Pending, LeaveStatus.Approved, LeaveStatus.Rejected, LeaveStatus.Cancelled].map((s) => <option key={s} value={s}>{leaveStatusLabels[s]}</option>)}
        </Select>
        <Select label="Type" value={leaveTypeId} onChange={(e) => { setLeaveTypeId(e.target.value); setPage(1); }}>
          <option value="">Any</option>
          {(types.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>
      <QueryBoundary isLoading={requests.isLoading} error={requests.error} data={requests.data} onRetry={() => requests.refetch()}
        isEmpty={(d) => d.items.length === 0} emptyState={<EmptyState title="No leave requests match" />}>
        {(data) => (
          <>
            <DataTable caption="Leave requests" rows={data.items} getRowKey={(r) => r.id}
              columns={[
                { key: "who", header: "Employee", render: (r) => <div><p className="font-medium text-slate-900">{r.employeeName}</p><p className="text-xs text-slate-500">{r.departmentName ?? "—"}</p></div> },
                { key: "type", header: "Type", render: (r) => r.leaveTypeName },
                { key: "dates", header: "Dates", render: (r) => `${formatPlainDate(r.startDate)} – ${formatPlainDate(r.endDate)}` },
                { key: "days", header: "Days", render: (r) => formatDays(r.daysCount) },
                { key: "status", header: "Status", render: (r) => <LeaveStatusBadge status={r.status} /> },
                { key: "by", header: "Decided by", hideBelow: "xl", render: (r) => r.decidedByName ?? "—" },
              ]}
              renderMobileRow={(r) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{r.employeeName}</p>
                    <p className="text-xs text-slate-500">{r.leaveTypeName} · {formatPlainDate(r.startDate)} – {formatPlainDate(r.endDate)}</p>
                  </div>
                  <LeaveStatusBadge status={r.status} />
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

/**
 * Who is away, day by day. Reasons are deliberately not shown - the API doesn't
 * include them in calendar entries.
 */
function LeaveCalendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = format(month, "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  const calendar = useLeaveCalendar(from, to);

  const days = useMemo(() => eachDayOfInterval({ start: month, end: endOfMonth(month) }), [month]);

  return (
    <Card>
      <CardHeader
        title={format(month, "MMMM yyyy")}
        description="Approved leave"
        action={
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" aria-label="Previous month" onClick={() => setMonth(startOfMonth(addDays(month, -1)))}><ChevronLeft aria-hidden className="size-4" /></Button>
            <Button size="sm" variant="secondary" aria-label="Next month" onClick={() => setMonth(startOfMonth(addDays(endOfMonth(month), 1)))}><ChevronRight aria-hidden className="size-4" /></Button>
          </div>
        }
      />
      <QueryBoundary isLoading={calendar.isLoading} error={calendar.error} data={calendar.data} onRetry={() => calendar.refetch()}
        isEmpty={(d) => d.length === 0} emptyState={<EmptyState title="Nobody is on approved leave this month" />}>
        {(entries) => (
          <ul className="divide-y divide-slate-100">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const away = entries.filter((e) => parseISO(e.startDate) <= day && parseISO(e.endDate) >= day);
              if (away.length === 0) return null;
              return (
                <li key={key} className={cn("flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4 sm:px-5", isWeekend(day) && "bg-slate-50")}>
                  <p className="w-32 shrink-0 text-sm font-medium text-slate-700">{format(day, "EEE d MMM")}</p>
                  <p className="text-sm text-slate-600">
                    {away.map((e) => `${e.employeeName} — ${e.leaveTypeName}`).join(", ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBoundary>
    </Card>
  );
}
