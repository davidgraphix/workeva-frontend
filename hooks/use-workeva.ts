"use client";

import { query } from "@/lib/api";
import { queryKeys, useApiMutation, useApiQuery } from "./use-api";
import type {
  AdminDashboardResponse,
  AttendanceActivityItem,
  AttendanceRecordResponse,
  AttendanceTodaySummary,
  AuditLogResponse,
  CompanySettingsResponse,
  DepartmentResponse,
  EmployeeDashboardResponse,
  EmployeeDetailResponse,
  EmployeeListItem,
  EmployeeStatus,
  EmploymentType,
  InvitationResponse,
  LeaveBalanceResponse,
  LeaveCalendarEntry,
  LeaveRequestResponse,
  LeaveStatus,
  LeaveTypeResponse,
  ManagerDashboardResponse,
  MemberResponse,
  MyAttendanceTodayResponse,
  NotificationPreferenceResponse,
  NotificationResponse,
  OrganizationResponse,
  PagedResult,
  RoleResponse,
  SuspiciousEventResponse,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  TaskSummaryResponse,
  WorkLocationResponse,
} from "@/lib/types";

/**
 * One hook per API resource. Screens call these; nothing calls the API directly.
 */

// ---------- Dashboards ----------

export const useAdminDashboard = () =>
  useApiQuery<AdminDashboardResponse>(queryKeys.dashboard("admin"), "/api/dashboard/admin", {
    // The dashboard answers "what is happening right now", so it refreshes often.
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

export const useManagerDashboard = () =>
  useApiQuery<ManagerDashboardResponse>(queryKeys.dashboard("manager"), "/api/dashboard/manager", {
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

export const useEmployeeDashboard = () =>
  useApiQuery<EmployeeDashboardResponse>(queryKeys.dashboard("employee"), "/api/dashboard/employee", {
    staleTime: 15_000,
  });

// ---------- Organization and settings ----------

export const useOrganization = () =>
  useApiQuery<OrganizationResponse>(queryKeys.organization, "/api/organizations/current");

export const useCompanySettings = () =>
  useApiQuery<CompanySettingsResponse>(queryKeys.settings, "/api/settings");

export const useUpdateOrganization = () =>
  useApiMutation<OrganizationResponse, Record<string, unknown>>(
    (request, body) => request("/api/organizations/current", { method: "PUT", body }),
    { invalidates: [queryKeys.organization, queryKeys.me] },
  );

export const useUpdateSettings = () =>
  useApiMutation<CompanySettingsResponse, CompanySettingsResponse>(
    (request, body) => request("/api/settings", { method: "PUT", body }),
    { invalidates: [queryKeys.settings, queryKeys.attendanceToday] },
  );

export const useCompleteOnboarding = () =>
  useApiMutation<void, void>(
    (request) => request("/api/organizations/current/complete-onboarding", { method: "POST" }),
    { invalidates: [queryKeys.me, queryKeys.organization] },
  );

// ---------- Roles and members ----------

export const useRoles = () => useApiQuery<RoleResponse[]>(queryKeys.roles, "/api/roles");

export const useMembers = () => useApiQuery<MemberResponse[]>(queryKeys.members, "/api/members");

export const useChangeMemberRole = () =>
  useApiMutation<void, { membershipId: string; roleId: string }>(
    (request, { membershipId, roleId }) =>
      request(`/api/members/${membershipId}/role`, { method: "PUT", body: { roleId } }),
    { invalidates: [queryKeys.members, queryKeys.roles] },
  );

export const useUpdateRolePermissions = () =>
  useApiMutation<RoleResponse, { roleId: string; permissions: string[] }>(
    (request, { roleId, permissions }) =>
      request(`/api/roles/${roleId}/permissions`, { method: "PUT", body: { permissions } }),
    { invalidates: [queryKeys.roles, queryKeys.me] },
  );

// ---------- Departments ----------

export const useDepartments = (includeArchived = false) =>
  useApiQuery<DepartmentResponse[]>(
    [...queryKeys.departments, includeArchived],
    `/api/departments${query({ includeArchived })}`,
  );

export const useSaveDepartment = () =>
  useApiMutation<DepartmentResponse, { id?: string; name: string; description: string | null; managerEmployeeId: string | null }>(
    (request, { id, ...body }) =>
      id
        ? request(`/api/departments/${id}`, { method: "PUT", body })
        : request("/api/departments", { method: "POST", body }),
    { invalidates: [queryKeys.departments, queryKeys.employees()] },
  );

export const useArchiveDepartment = () =>
  useApiMutation<void, string>(
    (request, id) => request(`/api/departments/${id}`, { method: "DELETE" }),
    { invalidates: [queryKeys.departments] },
  );

// ---------- Employees ----------

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  page?: number;
  pageSize?: number;
}

export const useEmployees = (filters: EmployeeFilters) =>
  useApiQuery<PagedResult<EmployeeListItem>>(
    queryKeys.employees(filters),
    `/api/employees${query(filters as Record<string, string | number | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useEmployee = (id: string | null) =>
  useApiQuery<EmployeeDetailResponse>(queryKeys.employee(id ?? ""), `/api/employees/${id}`, {
    enabled: Boolean(id),
  });

export const useCreateEmployee = () =>
  useApiMutation<EmployeeDetailResponse, Record<string, unknown>>(
    (request, body) => request("/api/employees", { method: "POST", body }),
    { invalidates: [queryKeys.employees(), ["employee"], queryKeys.departments] },
  );

export const useUpdateEmployee = () =>
  useApiMutation<EmployeeDetailResponse, { id: string; body: Record<string, unknown> }>(
    (request, { id, body }) => request(`/api/employees/${id}`, { method: "PUT", body }),
    { invalidates: [queryKeys.employees(), ["employee"], queryKeys.departments] },
  );

export const useChangeEmployeeStatus = () =>
  useApiMutation<EmployeeDetailResponse, { id: string; status: EmployeeStatus; reason?: string }>(
    (request, { id, status, reason }) =>
      request(`/api/employees/${id}/status`, { method: "POST", body: { status, reason } }),
    { invalidates: [queryKeys.employees(), ["employee"], queryKeys.dashboard("admin")] },
  );

export const useUpdateOwnProfile = () =>
  useApiMutation<EmployeeDetailResponse, { phone: string | null; photoUrl: string | null }>(
    (request, body) => request("/api/me/profile", { method: "PUT", body }),
    { invalidates: [queryKeys.me, queryKeys.employees()] },
  );

export const useEmployeeLeaveBalances = (employeeId: string | null) =>
  useApiQuery<LeaveBalanceResponse[]>(
    ["employee", employeeId ?? "", "leave-balances"],
    `/api/employees/${employeeId}/leave-balances`,
    { enabled: Boolean(employeeId) },
  );

// ---------- Invitations ----------

export const useInvitations = () =>
  useApiQuery<InvitationResponse[]>(queryKeys.invitations, "/api/invitations");

export const useCreateInvitation = () =>
  useApiMutation<InvitationResponse, Record<string, unknown>>(
    (request, body) => request("/api/invitations", { method: "POST", body }),
    { invalidates: [queryKeys.invitations] },
  );

export const useResendInvitation = () =>
  useApiMutation<InvitationResponse, string>(
    (request, id) => request(`/api/invitations/${id}/resend`, { method: "POST" }),
    { invalidates: [queryKeys.invitations] },
  );

export const useRevokeInvitation = () =>
  useApiMutation<void, string>(
    (request, id) => request(`/api/invitations/${id}`, { method: "DELETE" }),
    { invalidates: [queryKeys.invitations] },
  );

// ---------- Locations ----------

export const useLocations = (activeOnly = false) =>
  useApiQuery<WorkLocationResponse[]>(
    [...queryKeys.locations, activeOnly],
    `/api/locations${query({ activeOnly })}`,
  );

export const useSaveLocation = () =>
  useApiMutation<WorkLocationResponse, { id?: string; body: Record<string, unknown> }>(
    (request, { id, body }) =>
      id
        ? request(`/api/locations/${id}`, { method: "PUT", body })
        : request("/api/locations", { method: "POST", body }),
    { invalidates: [queryKeys.locations, queryKeys.attendanceToday] },
  );

export const useDeactivateLocation = () =>
  useApiMutation<void, string>(
    (request, id) => request(`/api/locations/${id}`, { method: "DELETE" }),
    { invalidates: [queryKeys.locations] },
  );

// ---------- Attendance ----------

export const useAttendanceToday = () =>
  useApiQuery<MyAttendanceTodayResponse>(queryKeys.attendanceToday, "/api/attendance/today", {
    staleTime: 10_000,
  });

export const useClockIn = () =>
  useApiMutation<AttendanceRecordResponse, { latitude: number | null; longitude: number | null; accuracyMeters: number | null }>(
    (request, body) => request("/api/attendance/clock-in", { method: "POST", body }),
    {
      invalidates: [
        queryKeys.attendanceToday,
        queryKeys.attendance(),
        queryKeys.attendanceSummary,
        queryKeys.dashboard("employee"),
        queryKeys.dashboard("admin"),
        queryKeys.dashboard("manager"),
      ],
    },
  );

export const useClockOut = () =>
  useApiMutation<AttendanceRecordResponse, { latitude: number | null; longitude: number | null; accuracyMeters: number | null }>(
    (request, body) => request("/api/attendance/clock-out", { method: "POST", body }),
    {
      invalidates: [
        queryKeys.attendanceToday,
        queryKeys.attendance(),
        queryKeys.attendanceSummary,
        queryKeys.dashboard("employee"),
        queryKeys.dashboard("admin"),
        queryKeys.dashboard("manager"),
      ],
    },
  );

export interface AttendanceFilters {
  employeeId?: string;
  departmentId?: string;
  from?: string;
  to?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

export const useAttendance = (filters: AttendanceFilters, scope: "all" | "me" = "all") =>
  useApiQuery<PagedResult<AttendanceRecordResponse>>(
    queryKeys.attendance({ ...filters, scope }),
    `/api/attendance${scope === "me" ? "/me" : ""}${query(filters as Record<string, string | number | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useAttendanceSummary = () =>
  useApiQuery<AttendanceTodaySummary>(queryKeys.attendanceSummary, "/api/attendance/summary", {
    refetchInterval: 60_000,
  });

export const useAttendanceActivity = (limit = 15) =>
  useApiQuery<AttendanceActivityItem[]>(
    [...queryKeys.attendanceActivity, limit],
    `/api/attendance/activity${query({ limit })}`,
    { refetchInterval: 60_000 },
  );

export const useSuspiciousEvents = (page: number) =>
  useApiQuery<PagedResult<SuspiciousEventResponse>>(
    queryKeys.suspicious(page),
    `/api/attendance/suspicious${query({ page })}`,
  );

// ---------- Leave ----------

export const useLeaveTypes = (activeOnly = true) =>
  useApiQuery<LeaveTypeResponse[]>(
    [...queryKeys.leaveTypes, activeOnly],
    `/api/leave/types${query({ activeOnly })}`,
  );

export const useSaveLeaveType = () =>
  useApiMutation<LeaveTypeResponse, { id?: string; body: Record<string, unknown> }>(
    (request, { id, body }) =>
      id
        ? request(`/api/leave/types/${id}`, { method: "PUT", body })
        : request("/api/leave/types", { method: "POST", body }),
    { invalidates: [queryKeys.leaveTypes, queryKeys.leaveBalances] },
  );

export const useMyLeaveBalances = () =>
  useApiQuery<LeaveBalanceResponse[]>(queryKeys.leaveBalances, "/api/leave/balances/me");

export const useSetLeaveBalance = () =>
  useApiMutation<LeaveBalanceResponse, { employeeId: string; leaveTypeId: string; year: number; allocatedDays: number }>(
    (request, body) => request("/api/leave/balances", { method: "PUT", body }),
    { invalidates: [queryKeys.leaveBalances, ["employee"]] },
  );

export interface LeaveFilters {
  employeeId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const useLeaveRequests = (filters: LeaveFilters, scope: "all" | "me" = "all") =>
  useApiQuery<PagedResult<LeaveRequestResponse>>(
    queryKeys.leaveRequests({ ...filters, scope }),
    `/api/leave/requests${scope === "me" ? "/me" : ""}${query(filters as Record<string, string | number | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useCreateLeaveRequest = () =>
  useApiMutation<LeaveRequestResponse, { leaveTypeId: string; startDate: string; endDate: string; reason: string }>(
    (request, body) => request("/api/leave/requests", { method: "POST", body }),
    {
      invalidates: [
        queryKeys.leaveRequests(),
        queryKeys.leaveBalances,
        queryKeys.dashboard("employee"),
      ],
    },
  );

export const useDecideLeave = () =>
  useApiMutation<LeaveRequestResponse, { id: string; decision: "approve" | "reject"; note?: string }>(
    (request, { id, decision, note }) =>
      request(`/api/leave/requests/${id}/${decision}`, { method: "POST", body: { note: note ?? null } }),
    {
      invalidates: [
        queryKeys.leaveRequests(),
        queryKeys.leaveBalances,
        queryKeys.dashboard("admin"),
        queryKeys.dashboard("manager"),
        ["leave", "calendar"],
      ],
    },
  );

export const useCancelLeave = () =>
  useApiMutation<LeaveRequestResponse, string>(
    (request, id) => request(`/api/leave/requests/${id}/cancel`, { method: "POST", body: {} }),
    { invalidates: [queryKeys.leaveRequests(), queryKeys.leaveBalances, queryKeys.dashboard("employee")] },
  );

export const useLeaveCalendar = (from: string, to: string) =>
  useApiQuery<LeaveCalendarEntry[]>(
    queryKeys.leaveCalendar(from, to),
    `/api/leave/calendar${query({ from, to })}`,
  );

// ---------- Tasks ----------

export interface TaskFilters {
  search?: string;
  assigneeEmployeeId?: string;
  departmentId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  onlyMine?: boolean;
  onlyOverdue?: boolean;
  page?: number;
  pageSize?: number;
}

export const useTasks = (filters: TaskFilters) =>
  useApiQuery<PagedResult<TaskResponse>>(
    queryKeys.tasks(filters),
    `/api/tasks${query(filters as Record<string, string | number | boolean | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useTaskSummary = (onlyMine: boolean) =>
  useApiQuery<TaskSummaryResponse>(
    queryKeys.taskSummary(onlyMine),
    `/api/tasks/summary${query({ onlyMine })}`,
  );

export const useSaveTask = () =>
  useApiMutation<TaskResponse, { id?: string; body: Record<string, unknown> }>(
    (request, { id, body }) =>
      id ? request(`/api/tasks/${id}`, { method: "PUT", body }) : request("/api/tasks", { method: "POST", body }),
    {
      invalidates: [
        queryKeys.tasks(),
        queryKeys.taskSummary(true),
        queryKeys.taskSummary(false),
        queryKeys.dashboard("employee"),
        queryKeys.dashboard("manager"),
        queryKeys.dashboard("admin"),
      ],
    },
  );

export const useUpdateTaskStatus = () =>
  useApiMutation<TaskResponse, { id: string; status: TaskStatus }>(
    (request, { id, status }) => request(`/api/tasks/${id}/status`, { method: "POST", body: { status } }),
    {
      invalidates: [
        queryKeys.tasks(),
        queryKeys.taskSummary(true),
        queryKeys.taskSummary(false),
        queryKeys.dashboard("employee"),
        queryKeys.dashboard("manager"),
      ],
    },
  );

// ---------- Notifications ----------

export const useNotifications = (page: number, unreadOnly = false) =>
  useApiQuery<PagedResult<NotificationResponse>>(
    queryKeys.notifications({ page, unreadOnly }),
    `/api/notifications${query({ page, unreadOnly })}`,
  );

export const useUnreadCount = () =>
  useApiQuery<{ count: number }>(queryKeys.unreadCount, "/api/notifications/unread-count", {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

export const useMarkNotificationRead = () =>
  useApiMutation<void, string>(
    (request, id) => request(`/api/notifications/${id}/read`, { method: "POST", body: {} }),
    { invalidates: [queryKeys.notifications(), queryKeys.unreadCount] },
  );

export const useMarkAllNotificationsRead = () =>
  useApiMutation<{ updated: number }, void>(
    (request) => request("/api/notifications/read-all", { method: "POST", body: {} }),
    { invalidates: [queryKeys.notifications(), queryKeys.unreadCount, queryKeys.dashboard("employee")] },
  );

export const useNotificationPreferences = () =>
  useApiQuery<NotificationPreferenceResponse[]>(
    queryKeys.notificationPreferences,
    "/api/me/notification-preferences",
  );

export const useUpdateNotificationPreferences = () =>
  useApiMutation<NotificationPreferenceResponse[], NotificationPreferenceResponse[]>(
    (request, preferences) =>
      request("/api/me/notification-preferences", { method: "PUT", body: { preferences } }),
    { invalidates: [queryKeys.notificationPreferences] },
  );

// ---------- Audit ----------

export interface AuditFilters {
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const useAuditLog = (filters: AuditFilters) =>
  useApiQuery<PagedResult<AuditLogResponse>>(
    queryKeys.audit(filters),
    `/api/audit${query(filters as Record<string, string | number | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useAuditActions = () =>
  useApiQuery<string[]>([...queryKeys.audit(), "actions"], "/api/audit/actions");
