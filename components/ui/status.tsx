"use client";

import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
  TaskPriority,
  TaskStatus,
  attendanceStatusLabels,
  employeeStatusLabels,
  leaveStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
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
