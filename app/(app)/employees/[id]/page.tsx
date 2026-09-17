"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { EmployeeDialog } from "@/components/features/employee-forms";
import { TaskList } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/field";
import { Avatar, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, PageSkeleton, QueryBoundary } from "@/components/ui/states";
import { AttendanceStatusBadge, EmployeeStatusBadge, LeaveStatusBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import {
  useAttendance,
  useChangeEmployeeStatus,
  useEmployee,
  useEmployeeLeaveBalances,
  useLeaveRequests,
  useSetLeaveBalance,
  useTasks,
} from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { formatDays, formatDuration, formatPlainDate, formatTime } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { EmployeeStatus, employeeStatusLabels, employmentTypeLabels, type LeaveBalanceResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Attendance", "Leave", "Tasks"] as const;
type Tab = (typeof TABS)[number];

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can, me } = useSession();
  const employee = useEmployee(id);
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Each tab is shown only if the viewer may read that kind of record; the API enforces the same.
  const visibleTabs = TABS.filter((t) =>
    t === "Overview" ||
    (t === "Attendance" && can(Permission.attendanceView)) ||
    (t === "Leave" && can(Permission.leaveView)) ||
    (t === "Tasks" && can(Permission.taskView)),
  );

  if (employee.isLoading) return <PageSkeleton />;
  if (employee.error || !employee.data) {
    return <Card><ErrorState error={employee.error} onRetry={() => employee.refetch()} /></Card>;
  }

  const e = employee.data;
  const isSelf = e.id === me?.active?.employeeId;

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft aria-hidden className="size-4" /> Employees
      </Link>

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={e.fullName} src={e.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{e.fullName}</h1>
              <EmployeeStatusBadge status={e.status} />
            </div>
            <p className="text-sm text-slate-500">{[e.jobTitle, e.departmentName, e.employeeNumber].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex gap-2">
            {can(Permission.employeeUpdate) && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil aria-hidden className="size-4" /> Edit</Button>
            )}
            {can(Permission.employeeDelete) && !isSelf && (
              <Button variant="secondary" onClick={() => setStatusOpen(true)}>Change status</Button>
            )}
          </div>
        </CardBody>

        <div role="tablist" aria-label="Profile sections" className="flex gap-1 overflow-x-auto border-t border-slate-200 px-3">
          {visibleTabs.map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      {tab === "Overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Details" />
            <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
              {[
                ["Email", e.email],
                ["Phone", e.phone ?? "—"],
                ["Manager", e.managerName ?? "—"],
                ["Department", e.departmentName ?? "—"],
                ["Employment type", employmentTypeLabels[e.employmentType]],
                ["Start date", formatPlainDate(e.startDate)],
                ["Account", e.hasAccount ? `Joined${e.roleKey ? ` · ${e.roleKey.replace("_", " ")}` : ""}` : "Not yet joined"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="truncate font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {can(Permission.leaveView) && <BalancesCard employeeId={e.id} />}
        </div>
      )}

      {tab === "Attendance" && <AttendanceTab employeeId={e.id} timezone={me?.active?.timezone} />}
      {tab === "Leave" && <LeaveTab employeeId={e.id} />}
      {tab === "Tasks" && <TasksTab employeeId={e.id} />}

      <EmployeeDialog open={editOpen} onClose={() => setEditOpen(false)} employee={e} />
      <StatusDialog open={statusOpen} onClose={() => setStatusOpen(false)} employeeId={e.id} name={e.fullName} current={e.status} />
    </>
  );
}

function StatusDialog({ open, onClose, employeeId, name, current }: { open: boolean; onClose: () => void; employeeId: string; name: string; current: EmployeeStatus }) {
  const change = useChangeEmployeeStatus();
  const toast = useToast();
  const [status, setStatus] = useState<EmployeeStatus>(current);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const destructive = status === EmployeeStatus.Terminated || status === EmployeeStatus.Inactive || status === EmployeeStatus.Suspended;

  async function apply() {
    try {
      await change.mutateAsync({ id: employeeId, status, reason: reason || undefined });
      toast.success(`${name} is now ${employeeStatusLabels[status].toLowerCase()}`);
      setConfirming(false);
      onClose();
    } catch (error) {
      toast.error("Couldn't change status", error instanceof ApiError ? error.message : undefined);
      setConfirming(false);
    }
  }

  return (
    <>
      <Dialog open={open && !confirming} onClose={onClose} title={`Change status for ${name}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant={destructive ? "danger" : "primary"} disabled={status === current}
              onClick={() => (destructive ? setConfirming(true) : apply())} loading={change.isPending}>
              Continue
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(Number(e.target.value) as EmployeeStatus)}>
            {[EmployeeStatus.Active, EmployeeStatus.Suspended, EmployeeStatus.Inactive, EmployeeStatus.Terminated].map((s) => (
              <option key={s} value={s}>{employeeStatusLabels[s]}</option>
            ))}
          </Select>
          <Textarea label="Reason (optional)" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
            hint="Recorded in the audit trail." />
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={apply}
        loading={change.isPending}
        title={`Mark ${name} as ${employeeStatusLabels[status].toLowerCase()}?`}
        message={`${name} will no longer be able to clock in or request leave. Their records are kept, and you can reactivate them later.`}
        confirmLabel={`Mark as ${employeeStatusLabels[status].toLowerCase()}`}
      />
    </>
  );
}

function BalancesCard({ employeeId }: { employeeId: string }) {
  const { can } = useSession();
  const balances = useEmployeeLeaveBalances(employeeId);
  const [editing, setEditing] = useState<LeaveBalanceResponse | null>(null);

  return (
    <Card className="self-start">
      <CardHeader title="Leave balances" description={`${new Date().getFullYear()}`} />
      <QueryBoundary isLoading={balances.isLoading} error={balances.error} data={balances.data} onRetry={() => balances.refetch()}>
        {(data) => (
          <ul className="divide-y divide-slate-100">
            {data.map((b) => (
              <li key={b.leaveTypeId} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div>
                  <p className="text-sm text-slate-900">{b.leaveTypeName}</p>
                  <p className="text-xs text-slate-500">{b.usedDays} used · {b.pendingDays} pending</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 numeric">{b.remainingDays}/{b.allocatedDays}</p>
                  {can(Permission.leaveManage) && (
                    <button type="button" aria-label={`Edit ${b.leaveTypeName} allowance`} onClick={() => setEditing(b)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <Pencil aria-hidden className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      {editing && <AllowanceDialog employeeId={employeeId} balance={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function AllowanceDialog({ employeeId, balance, onClose }: { employeeId: string; balance: LeaveBalanceResponse; onClose: () => void }) {
  const set = useSetLeaveBalance();
  const toast = useToast();
  const [value, setValue] = useState(String(balance.allocatedDays));

  return (
    <Dialog open onClose={onClose} title={`${balance.leaveTypeName} allowance`} description={`For ${balance.year}`} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={set.isPending} onClick={async () => {
            try {
              await set.mutateAsync({ employeeId, leaveTypeId: balance.leaveTypeId, year: balance.year, allocatedDays: Number(value) });
              toast.success("Allowance updated");
              onClose();
            } catch (error) {
              toast.error("Couldn't update", error instanceof ApiError ? error.message : undefined);
            }
          }}>Save</Button>
        </>
      }>
      <label htmlFor="allowance" className="block text-sm font-medium text-slate-700">Days allocated</label>
      <input id="allowance" type="number" min={0} max={400} step={0.5} value={value} onChange={(e) => setValue(e.target.value)}
        className="mt-1.5 block h-10 w-full rounded-md border-0 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600" />
    </Dialog>
  );
}

function AttendanceTab({ employeeId, timezone }: { employeeId: string; timezone?: string }) {
  const records = useAttendance({ employeeId, pageSize: 30 });
  return (
    <Card>
      <CardHeader title="Recent attendance" />
      <QueryBoundary isLoading={records.isLoading} error={records.error} data={records.data} onRetry={() => records.refetch()}
        isEmpty={(d) => d.items.length === 0} emptyState={<EmptyState title="No attendance recorded yet" />}>
        {(data) => (
          <DataTable rows={data.items} getRowKey={(r) => r.id} caption="Attendance"
            columns={[
              { key: "d", header: "Date", render: (r) => formatPlainDate(r.workDate) },
              { key: "s", header: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
              { key: "i", header: "In", render: (r) => formatTime(r.clockInAt, timezone) },
              { key: "o", header: "Out", render: (r) => formatTime(r.clockOutAt, timezone) },
              { key: "w", header: "Worked", align: "right", render: (r) => formatDuration(r.workedMinutes) },
            ]}
            renderMobileRow={(r) => (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{formatPlainDate(r.workDate)}</p>
                  <p className="text-xs text-slate-500">{formatTime(r.clockInAt, timezone)} – {formatTime(r.clockOutAt, timezone)}</p>
                </div>
                <AttendanceStatusBadge status={r.status} />
              </div>
            )}
          />
        )}
      </QueryBoundary>
    </Card>
  );
}

function LeaveTab({ employeeId }: { employeeId: string }) {
  const requests = useLeaveRequests({ employeeId, pageSize: 30 });
  return (
    <Card>
      <CardHeader title="Leave history" />
      <QueryBoundary isLoading={requests.isLoading} error={requests.error} data={requests.data} onRetry={() => requests.refetch()}
        isEmpty={(d) => d.items.length === 0} emptyState={<EmptyState title="No leave requests" />}>
        {(data) => (
          <DataTable rows={data.items} getRowKey={(r) => r.id} caption="Leave"
            columns={[
              { key: "t", header: "Type", render: (r) => r.leaveTypeName },
              { key: "d", header: "Dates", render: (r) => `${formatPlainDate(r.startDate)} – ${formatPlainDate(r.endDate)}` },
              { key: "n", header: "Days", render: (r) => formatDays(r.daysCount) },
              { key: "s", header: "Status", render: (r) => <LeaveStatusBadge status={r.status} /> },
            ]}
            renderMobileRow={(r) => (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{r.leaveTypeName}</p>
                  <p className="text-xs text-slate-500">{formatPlainDate(r.startDate)} – {formatPlainDate(r.endDate)}</p>
                </div>
                <LeaveStatusBadge status={r.status} />
              </div>
            )}
          />
        )}
      </QueryBoundary>
    </Card>
  );
}

function TasksTab({ employeeId }: { employeeId: string }) {
  const tasks = useTasks({ assigneeEmployeeId: employeeId, pageSize: 50 });
  return (
    <Card>
      <CardHeader title="Assigned tasks" />
      <QueryBoundary isLoading={tasks.isLoading} error={tasks.error} data={tasks.data} onRetry={() => tasks.refetch()}>
        {(data) => <TaskList tasks={data.items} />}
      </QueryBoundary>
    </Card>
  );
}
