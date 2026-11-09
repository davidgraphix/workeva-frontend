"use client";

import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
  TaskPriority,
  TaskStatus,
  ProjectStatus,
  ProjectMemberRole,
  attendanceStatusLabels,
  employeeStatusLabels,
  leaveStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
  projectStatusLabels,
  projectMemberRoleLabels,
} from "@/lib/types";
import { Badge, StatusDot } from "./surfaces";

/**
 * Status rendering, in one place.
 *
 * Every badge carries a word as well as a colour, so meaning never depends on
 * being able to tell green from orange.
 */

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const tones = {
    [AttendanceStatus.Present]: "success",
    [AttendanceStatus.Late]: "warning",
    [AttendanceStatus.CheckedOut]: "info",
    [AttendanceStatus.OnLeave]: "neutral",
    [AttendanceStatus.Absent]: "danger",
    [AttendanceStatus.NotCheckedIn]: "neutral",
    [AttendanceStatus.OffDay]: "neutral",
  } as const;

  return (
    <Badge tone={tones[status]} icon={<StatusDot tone={tones[status]} />}>
      {attendanceStatusLabels[status]}
    </Badge>
  );
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const tones = {
    [EmployeeStatus.Active]: "success",
    [EmployeeStatus.Suspended]: "warning",
    [EmployeeStatus.Inactive]: "neutral",
    [EmployeeStatus.Terminated]: "danger",
  } as const;

  return (
    <Badge tone={tones[status]} icon={<StatusDot tone={tones[status]} />}>
      {employeeStatusLabels[status]}
    </Badge>
  );
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const tones = {
    [LeaveStatus.Pending]: "warning",
    [LeaveStatus.Approved]: "success",
    [LeaveStatus.Rejected]: "danger",
    [LeaveStatus.Cancelled]: "neutral",
  } as const;

  return (
    <Badge tone={tones[status]} icon={<StatusDot tone={tones[status]} />}>
      {leaveStatusLabels[status]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tones = {
    [TaskStatus.ToDo]: "neutral",
    [TaskStatus.InProgress]: "info",
    [TaskStatus.Completed]: "success",
    [TaskStatus.Cancelled]: "neutral",
  } as const;

  return (
    <Badge tone={tones[status]} icon={<StatusDot tone={tones[status]} />}>
      {taskStatusLabels[status]}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const tones = {
    [TaskPriority.Low]: "neutral",
    [TaskPriority.Medium]: "info",
    [TaskPriority.High]: "warning",
    [TaskPriority.Urgent]: "danger",
  } as const;

  return <Badge tone={tones[priority]}>{taskPriorityLabels[priority]}</Badge>;
}

export function OverdueBadge() {
  return <Badge tone="danger">Overdue</Badge>;
}

// ---------- M2: projects ----------

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tones = {
    [ProjectStatus.Planning]: "neutral",
    [ProjectStatus.Active]: "info",
    // On hold is a warning rather than neutral: a paused project with a deadline is not
    // progressing towards it, and the dashboard treats it as at risk for that reason.
    [ProjectStatus.OnHold]: "warning",
    [ProjectStatus.Completed]: "success",
    [ProjectStatus.Cancelled]: "neutral",
  } as const;

  return (
    <Badge tone={tones[status]} icon={<StatusDot tone={tones[status]} />}>
      {projectStatusLabels[status]}
    </Badge>
  );
}

export function ProjectMemberRoleBadge({ role }: { role: ProjectMemberRole }) {
  const tones = {
    [ProjectMemberRole.Member]: "neutral",
    [ProjectMemberRole.Lead]: "info",
    [ProjectMemberRole.Viewer]: "neutral",
  } as const;

  return <Badge tone={tones[role]}>{projectMemberRoleLabels[role]}</Badge>;
}

/**
 * At risk, not yet overdue. Shown instead of nothing when a project is heading for trouble
 * while there is still time to act - which is the only warning worth having.
 */
export function AtRiskBadge() {
  return <Badge tone="warning">At risk</Badge>;
}

export function BlockedBadge({ count }: { count?: number }) {
  return (
    <Badge tone="warning">
      {count && count > 1 ? `Blocked by ${count}` : "Blocked"}
    </Badge>
  );
}

/**
 * A progress bar that states its own value in words as well as in width.
 *
 * `role="progressbar"` with the aria value attributes, because a bar whose only output is a
 * number of pixels tells a screen reader nothing. The percentage is also rendered as text, so
 * it survives a stylesheet that does not load.
 */
export function ProgressBar({
  value,
  label,
  tone = "info",
  className,
}: {
  value: number;
  label?: string;
  tone?: "info" | "success" | "warning" | "danger";
  className?: string;
}) {
  // Clamped and guarded against a non-finite value. A bar is rendered from whatever the API
  // sent, and `width: NaN%` with `aria-valuenow="NaN"` is a broken bar plus a broken
  // announcement - worse than showing nothing done.
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

  const fills = {
    info: "bg-brand-600",
    success: "bg-success-600",
    warning: "bg-warning-600",
    danger: "bg-danger-600",
  } as const;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{label ?? "Progress"}</span>
        <span className="numeric text-xs font-medium text-slate-700">{clamped}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${fills[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
