"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardHeader, StatCard } from "@/components/ui/surfaces";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useApiQuery, useCsvDownload, queryKeys } from "@/hooks/use-api";
import { useDepartments } from "@/hooks/use-workeva";
import { ApiError, query } from "@/lib/api";
import { formatDuration, formatPlainDate, isoDaysFromNow, todayIso } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import type { AttendanceReportSummaryRow, LeaveReportRow, TaskReportRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [["attendance", "Attendance"], ["leave", "Leave"], ["tasks", "Tasks"]] as const;
type TabKey = (typeof TABS)[number][0];

const PRESETS = [
  { label: "Today", from: () => todayIso(), to: () => todayIso() },
  { label: "Last 7 days", from: () => isoDaysFromNow(-6), to: () => todayIso() },
  { label: "Last 30 days", from: () => isoDaysFromNow(-29), to: () => todayIso() },
];

export default function ReportsPage() {
  const { can } = useSession();
  const departments = useDepartments();
  const download = useCsvDownload();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("attendance");
  const [from, setFrom] = useState(isoDaysFromNow(-29));
  const [to, setTo] = useState(todayIso());
  const [departmentId, setDepartmentId] = useState("");
  const [exporting, setExporting] = useState(false);

  if (!can(Permission.reportsView)) return <NoAccess />;

  const params = { from, to, departmentId: departmentId || undefined };
  const csvPath =
    tab === "attendance" ? `/api/reports/attendance-summary.csv${query(params)}`
      : tab === "leave" ? `/api/reports/leave.csv${query(params)}`
        : `/api/reports/tasks.csv${query({ departmentId: departmentId || undefined })}`;

  return (
    <>
      <PageHeader title="Reports" description="Every report respects your access, and every export is recorded in the audit trail."
        actions={
          <Button variant="secondary" loading={exporting} onClick={async () => {
            setExporting(true);
            try { await download(csvPath); } catch (error) {
              toast.error("Export failed", error instanceof ApiError ? error.message : undefined);
            } finally { setExporting(false); }
          }}>
            <Download aria-hidden className="size-4" /> Export CSV
          </Button>
        } />

      <div role="tablist" aria-label="Report type" className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {label}
          </button>
        ))}
      </div>

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:items-end">
          {tab !== "tasks" && (
            <>
              <Input label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <Input label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          {tab !== "tasks" && (
            <div className="col-span-2 flex flex-wrap gap-1 md:col-span-1">
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="ghost" onClick={() => { setFrom(p.from()); setTo(p.to()); }}>{p.label}</Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {tab === "attendance" && <AttendanceReport from={from} to={to} departmentId={departmentId} />}
      {tab === "leave" && <LeaveReport from={from} to={to} departmentId={departmentId} />}
      {tab === "tasks" && <TaskReport departmentId={departmentId} />}
    </>
  );
}

function AttendanceReport({ from, to, departmentId }: { from: string; to: string; departmentId: string }) {
  const params = { from, to, departmentId: departmentId || undefined };
  const report = useApiQuery<AttendanceReportSummaryRow[]>(queryKeys.reports("attendance", params), `/api/reports/attendance/summary${query(params)}`);

  return (
    <QueryBoundary isLoading={report.isLoading} error={report.error} data={report.data} onRetry={() => report.refetch()}
      isEmpty={(d) => d.length === 0} emptyState={<Card><EmptyState title="No employees in this report" /></Card>}>
      {(rows) => {
        const totals = rows.reduce((acc, r) => ({ present: acc.present + r.daysPresent, late: acc.late + r.daysLate, leave: acc.leave + r.daysOnLeave, absent: acc.absent + r.daysAbsent }), { present: 0, late: 0, leave: 0, absent: 0 });
        const chartRows = rows.slice(0, 15).map((r) => ({ name: r.employeeName.split(" ")[0], Present: r.daysPresent, Late: r.daysLate, "On leave": r.daysOnLeave, Absent: r.daysAbsent }));
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Days present" value={totals.present} tone="success" />
              <StatCard label="Late arrivals" value={totals.late} tone="warning" />
              <StatCard label="Days on leave" value={totals.leave} />
              <StatCard label="Days absent" value={totals.absent} tone={totals.absent > 0 ? "danger" : "neutral"} />
            </div>

            <Card>
              <CardHeader title="Attendance by employee" description={rows.length > 15 ? "First 15 employees shown; the table and export include everyone." : undefined} />
              <div className="h-72 p-4" role="img" aria-label="Bar chart of days present, late, on leave and absent per employee. The same figures are in the table below.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Present" stackId="a" fill="#16A34A" />
                    <Bar dataKey="Late" stackId="a" fill="#D97706" />
                    <Bar dataKey="On leave" stackId="a" fill="#94A3B8" />
                    <Bar dataKey="Absent" stackId="a" fill="#DC2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable caption="Attendance summary" rows={rows} getRowKey={(r) => r.employeeNumber}
                columns={[
                  { key: "n", header: "Employee", render: (r) => <div><p className="font-medium text-slate-900">{r.employeeName}</p><p className="text-xs text-slate-500">{r.department ?? "—"}</p></div> },
                  { key: "p", header: "Present", align: "right", render: (r) => r.daysPresent },
                  { key: "l", header: "Late", align: "right", render: (r) => r.daysLate },
                  { key: "v", header: "Leave", align: "right", render: (r) => r.daysOnLeave },
                  { key: "a", header: "Absent", align: "right", render: (r) => r.daysAbsent },
                  { key: "w", header: "Hours worked", align: "right", hideBelow: "lg", render: (r) => formatDuration(r.totalWorkedMinutes) },
                ]}
                renderMobileRow={(r) => (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.employeeName}</p>
                    <p className="text-xs text-slate-500">{r.daysPresent} present · {r.daysLate} late · {r.daysOnLeave} leave · {r.daysAbsent} absent</p>
                  </div>
                )} />
            </Card>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

function LeaveReport({ from, to, departmentId }: { from: string; to: string; departmentId: string }) {
  const params = { from, to, departmentId: departmentId || undefined };
  const report = useApiQuery<LeaveReportRow[]>(queryKeys.reports("leave", params), `/api/reports/leave${query(params)}`);

  return (
    <Card>
      <QueryBoundary isLoading={report.isLoading} error={report.error} data={report.data} onRetry={() => report.refetch()}
        isEmpty={(d) => d.length === 0} emptyState={<EmptyState title="No leave in this period" />}>
        {(rows) => (
          <DataTable caption="Leave report" rows={rows} getRowKey={(r) => `${r.employeeNumber}-${r.startDate}-${r.leaveType}`}
            columns={[
              { key: "n", header: "Employee", render: (r) => <span className="font-medium text-slate-900">{r.employeeName}</span> },
              { key: "t", header: "Type", render: (r) => r.leaveType },
              { key: "d", header: "Dates", render: (r) => `${formatPlainDate(r.startDate)} – ${formatPlainDate(r.endDate)}` },
              { key: "c", header: "Days", align: "right", render: (r) => r.days },
              { key: "s", header: "Status", render: (r) => r.status },
            ]}
            renderMobileRow={(r) => (
              <div>
                <p className="text-sm font-medium text-slate-900">{r.employeeName} · {r.status}</p>
                <p className="text-xs text-slate-500">{r.leaveType} · {formatPlainDate(r.startDate)} – {formatPlainDate(r.endDate)}</p>
              </div>
            )} />
        )}
      </QueryBoundary>
    </Card>
  );
}

function TaskReport({ departmentId }: { departmentId: string }) {
  const params = { departmentId: departmentId || undefined };
  const report = useApiQuery<TaskReportRow[]>(queryKeys.reports("tasks", params), `/api/reports/tasks${query(params)}`);

  return (
    <Card>
      <QueryBoundary isLoading={report.isLoading} error={report.error} data={report.data} onRetry={() => report.refetch()}
        isEmpty={(d) => d.length === 0} emptyState={<EmptyState title="No tasks yet" />}>
        {(rows) => (
          <DataTable caption="Task report" rows={rows} getRowKey={(r) => `${r.title}-${r.createdAt}`}
            columns={[
              { key: "t", header: "Task", render: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
              { key: "a", header: "Assignee", render: (r) => r.assignee ?? "Unassigned" },
              { key: "p", header: "Priority", render: (r) => r.priority },
              { key: "s", header: "Status", render: (r) => (r.isOverdue ? `${r.status} (overdue)` : r.status) },
              { key: "d", header: "Due", hideBelow: "lg", render: (r) => formatPlainDate(r.dueDate) },
            ]}
            renderMobileRow={(r) => (
              <div>
                <p className="text-sm font-medium text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">{r.assignee ?? "Unassigned"} · {r.status}{r.isOverdue ? " · overdue" : ""}</p>
              </div>
            )} />
        )}
      </QueryBoundary>
    </Card>
  );
}
