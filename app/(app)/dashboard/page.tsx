"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, ClipboardList, Plus, UserPlus, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ClockCard } from "@/components/features/clock-card";
import { ActivityFeed, LeaveApprovalList, LeaveRequestDialog, TaskDialog, TaskList } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/surfaces";
import { CardSkeleton, ErrorState, PageSkeleton } from "@/components/ui/states";
import { LeaveStatusBadge } from "@/components/ui/status";
import { useAdminDashboard, useEmployeeDashboard, useManagerDashboard } from "@/hooks/use-workeva";
import { formatDays, formatPlainDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { AccessScope, type AttendanceTodaySummary } from "@/lib/types";

/**
 * One route, three dashboards. Which one a person sees follows from their scope:
 * company-wide roles get "what is happening in my company", managers get "what is
 * happening with my team", and everyone else gets "what do I need to do today".
 */
export default function DashboardPage() {
  const { me } = useSession();
  const scope = me?.active?.scope;

  if (scope === AccessScope.Organization) return <AdminDashboard />;
  if (scope === AccessScope.Department) return <ManagerDashboard />;
  return <EmployeeDashboard />;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function firstName(name: string | null | undefined) {
  return name?.split(" ")[0] ?? "";
}

function AttendanceStats({ summary }: { summary: AttendanceTodaySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Employees" value={summary.totalEmployees} />
      <StatCard label="Present" value={summary.present} tone="success" />
      <StatCard label="Late" value={summary.late} tone="warning" />
      <StatCard label="On leave" value={summary.onLeave} />
      <StatCard label="Not checked in" value={summary.notCheckedIn} tone={summary.notCheckedIn > 0 && summary.isWorkingDay ? "danger" : "neutral"} />
      <StatCard label="Working now" value={summary.currentlyWorking} tone="info" hint={`${summary.checkedOut} checked out`} />
    </div>
  );
}

function AdminDashboard() {
  const { me, can } = useSession();
  const dashboard = useAdminDashboard();
  const [taskOpen, setTaskOpen] = useState(false);
  const timezone = me?.active?.timezone;
  const hasEmployee = Boolean(me?.active?.employeeId);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(me?.active?.employeeFullName ?? me?.fullName)}`}
        description="Here's what's happening in your company right now."
        actions={
          <>
            {can(Permission.employeeInvite) && (
              <Link href="/employees?invite=1">
                <Button variant="secondary"><UserPlus aria-hidden className="size-4" /> Invite</Button>
              </Link>
            )}
            {can(Permission.taskCreate) && (
              <Button onClick={() => setTaskOpen(true)}><Plus aria-hidden className="size-4" /> New task</Button>
            )}
          </>
        }
      />

      {!me?.active?.onboardingCompleted && (
        <Card className="mb-5 border-brand-200 bg-brand-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-700">Finish setting up your company to start tracking attendance.</p>
            <Link href="/onboarding"><Button size="sm">Continue setup</Button></Link>
          </CardBody>
        </Card>
      )}

      {dashboard.isLoading ? (
        <PageSkeleton />
      ) : dashboard.error || !dashboard.data ? (
        <Card><ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} /></Card>
      ) : (
        <div className="space-y-5">
          <AttendanceStats summary={dashboard.data.attendance} />

          {dashboard.data.suspiciousEventsLast7Days > 0 && (
            <Link href="/attendance?tab=review" className="block">
              <Card className="border-warning-600/30 bg-warning-50 transition-colors hover:bg-warning-50/70">
                <CardBody className="flex items-center gap-3 py-3">
                  <AlertTriangle aria-hidden className="size-5 text-warning-600" />
                  <p className="text-sm text-warning-700">
                    {dashboard.data.suspiciousEventsLast7Days} attendance event(s) in the last 7 days need review.
                  </p>
                </CardBody>
              </Card>
            </Link>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader title="Recent attendance" description="Clock-ins and clock-outs from the last day"
                  action={<Link href="/attendance" className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>} />
                <ActivityFeed items={dashboard.data.recentActivity} timezone={timezone} />
              </Card>

              <Card>
                <CardHeader
                  title="Awaiting your approval"
                  description={`${dashboard.data.pendingLeaveRequests} pending leave request(s)`}
                  action={<Link href="/leave" className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>}
                />
                <LeaveApprovalList requests={dashboard.data.awaitingApproval} />
              </Card>
            </div>

            <div className="space-y-5">
              {hasEmployee && <ClockCard />}

              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Open tasks" value={dashboard.data.openTasks} icon={<ClipboardList aria-hidden className="size-4" />} href="/tasks" />
                <StatCard label="Overdue" value={dashboard.data.overdueTasks} tone={dashboard.data.overdueTasks > 0 ? "danger" : "neutral"} href="/tasks?overdue=1" />
                <StatCard label="Active staff" value={dashboard.data.activeEmployees} icon={<Users aria-hidden className="size-4" />} href="/employees" />
                <StatCard label="Pending leave" value={dashboard.data.pendingLeaveRequests} icon={<CalendarDays aria-hidden className="size-4" />} tone={dashboard.data.pendingLeaveRequests > 0 ? "warning" : "neutral"} href="/leave" />
              </div>

              <Card>
                <CardHeader title="Notifications" action={<Link href="/notifications" className="text-xs font-medium text-brand-600 hover:text-brand-700">All</Link>} />
                {dashboard.data.recentNotifications.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.data.recentNotifications.map((n) => (
                      <li key={n.id} className="px-4 py-3 sm:px-5">
                        <p className={`text-sm ${n.isRead ? "text-slate-600" : "font-medium text-slate-900"}`}>{n.title}</p>
                        <p className="text-xs text-slate-500">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      <TaskDialog open={taskOpen} onClose={() => setTaskOpen(false)} />
    </>
  );
}

function ManagerDashboard() {
  const { me } = useSession();
  const dashboard = useManagerDashboard();
  const [taskOpen, setTaskOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(me?.active?.employeeFullName ?? me?.fullName)}`}
        description="Here's what's happening with your team."
        actions={<Button onClick={() => setTaskOpen(true)}><Plus aria-hidden className="size-4" /> New task</Button>}
      />

      {dashboard.isLoading ? (
        <PageSkeleton />
      ) : dashboard.error || !dashboard.data ? (
        <Card><ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <AttendanceStats summary={dashboard.data.teamAttendance} />

            <Card>
              <CardHeader title="Leave awaiting approval" description={`${dashboard.data.pendingLeaveRequests} pending`} />
              <LeaveApprovalList requests={dashboard.data.awaitingApproval} />
            </Card>

            <Card>
              <CardHeader title="Team activity" />
              <ActivityFeed items={dashboard.data.recentActivity} timezone={me?.active?.timezone} />
            </Card>
          </div>

          <div className="space-y-5">
            <ClockCard />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Team size" value={dashboard.data.teamSize} />
              <StatCard label="In progress" value={dashboard.data.tasks.inProgress} tone="info" href="/tasks" />
              <StatCard label="To do" value={dashboard.data.tasks.toDo} href="/tasks" />
              <StatCard label="Overdue" value={dashboard.data.tasks.overdue} tone={dashboard.data.tasks.overdue > 0 ? "danger" : "neutral"} href="/tasks?overdue=1" />
            </div>
          </div>
        </div>
      )}

      <TaskDialog open={taskOpen} onClose={() => setTaskOpen(false)} />
    </>
  );
}

function EmployeeDashboard() {
  const { me } = useSession();
  const dashboard = useEmployeeDashboard();
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(me?.active?.employeeFullName ?? me?.fullName)}`}
        description="Here's what you need to know today."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* The clock card leads on a phone: it's the first thing most people need. */}
        <div className="space-y-5 lg:order-2">
          <ClockCard />
        </div>

        <div className="space-y-5 lg:order-1 lg:col-span-2">
          {dashboard.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : dashboard.error || !dashboard.data ? (
            <Card><ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} /></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="My open tasks" value={dashboard.data.tasks.toDo + dashboard.data.tasks.inProgress} href="/my-tasks" />
                <StatCard label="Due today" value={dashboard.data.tasks.dueToday} tone={dashboard.data.tasks.dueToday > 0 ? "warning" : "neutral"} href="/my-tasks" />
                <StatCard label="Overdue" value={dashboard.data.tasks.overdue} tone={dashboard.data.tasks.overdue > 0 ? "danger" : "neutral"} href="/my-tasks" />
                <StatCard label="Unread alerts" value={dashboard.data.unreadNotifications} href="/notifications" />
              </div>

              <Card>
                <CardHeader title="My tasks" action={<Link href="/my-tasks" className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>} />
                <TaskList tasks={dashboard.data.upcomingTasks} />
              </Card>

              <Card>
                <CardHeader
                  title="Leave"
                  action={<Button size="sm" variant="secondary" onClick={() => setLeaveOpen(true)}>Request leave</Button>}
                />
                <CardBody>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {dashboard.data.leaveBalances.filter((b) => b.allocatedDays > 0).map((balance) => (
                      <div key={balance.leaveTypeId} className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{balance.leaveTypeName}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 numeric">{balance.remainingDays}</p>
                        <p className="text-xs text-slate-500">of {balance.allocatedDays} days left</p>
                      </div>
                    ))}
                  </div>
                  {dashboard.data.recentLeave.length > 0 && (
                    <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                      {dashboard.data.recentLeave.map((request) => (
                        <li key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div>
                            <p className="text-sm text-slate-900">{request.leaveTypeName}</p>
                            <p className="text-xs text-slate-500">
                              {formatPlainDate(request.startDate)} – {formatPlainDate(request.endDate)} · {formatDays(request.daysCount)}
                            </p>
                          </div>
                          <LeaveStatusBadge status={request.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <LeaveRequestDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} />
    </>
  );
}
