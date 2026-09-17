/**
 * The API contract, mirrored in TypeScript.
 *
 * These types correspond one-to-one with the DTOs in
 * `Workeva.Application/Contracts`. Keeping them hand-written rather than
 * generated means a backend change that breaks the frontend shows up as a
 * compile error here, which is the point.
 *
 * Enums are numeric because the API serialises them that way; the label maps at
 * the bottom are the only place those numbers become words a person reads.
 */

// ---------- Enums ----------

export enum MembershipStatus {
  Invited = 0,
  Active = 1,
  Suspended = 2,
  Removed = 3,
}

export enum AccessScope {
  Self = 0,
  Department = 1,
  Organization = 2,
}

export enum EmployeeStatus {
  Active = 0,
  Suspended = 1,
  Inactive = 2,
  Terminated = 3,
}

export enum EmploymentType {
  FullTime = 0,
  PartTime = 1,
  Contract = 2,
  Intern = 3,
}

export enum InvitationStatus {
  Pending = 0,
  Accepted = 1,
  Revoked = 2,
  Expired = 3,
}

export enum AttendanceStatus {
  NotCheckedIn = 0,
  Present = 1,
  Late = 2,
  CheckedOut = 3,
  OnLeave = 4,
  Absent = 5,
  OffDay = 6,
}

export enum AttendanceEventType {
  ClockIn = 0,
  ClockOut = 1,
}

export enum AttendanceEventOutcome {
  Accepted = 0,
  RejectedOutsideRadius = 1,
  RejectedInvalidState = 2,
  RejectedLocationMissing = 3,
}

export enum LeaveStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3,
}

export enum TaskStatus {
  ToDo = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3,
}

export enum NotificationCategory {
  Attendance = 0,
  Leave = 1,
  Task = 2,
  System = 3,
}

// ---------- Shared ----------

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

// ---------- Session ----------

export interface MembershipSummary {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  roleKey: string;
  roleName: string;
  status: MembershipStatus;
}

export interface ActiveMembership {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  timezone: string;
  onboardingCompleted: boolean;
  roleKey: string;
  roleName: string;
  scope: AccessScope;
  employeeId: string | null;
  employeeNumber: string | null;
  employeeFullName: string | null;
  employeeStatus: EmployeeStatus | null;
  permissions: string[];
}

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  memberships: MembershipSummary[];
  active: ActiveMembership | null;
  needsOrganization: boolean;
  /** Why there is no active organization: "employee_inactive", "organization_forbidden" or "organization_ambiguous". */
  accessIssue: string | null;
}

// ---------- Organization ----------

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  timezone: string;
  status: number;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface CompanySettingsResponse {
  workingDaysMask: number;
  workDayStart: string;
  workDayEnd: string;
  gracePeriodMinutes: number;
  requireLocationForAttendance: boolean;
  defaultRadiusMeters: number;
  suspiciousDistanceMeters: number;
  suspiciousFailedAttemptsThreshold: number;
  enforceLeaveBalance: boolean;
  notifyManagersOnClockIn: boolean;
  notifyManagersOnLateArrival: boolean;
  emailNotificationsEnabled: boolean;
}

export interface RoleResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: AccessScope;
  isSystem: boolean;
  permissions: string[];
  memberCount: number;
}

export interface MemberResponse {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  status: MembershipStatus;
  joinedAt: string;
  employeeId: string | null;
}

// ---------- Workforce ----------

export interface DepartmentResponse {
  id: string;
  name: string;
  description: string | null;
  managerEmployeeId: string | null;
  managerName: string | null;
  employeeCount: number;
  isArchived: boolean;
  createdAt: string;
}

export interface EmployeeListItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  photoUrl: string | null;
  jobTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  hasAccount: boolean;
}

export interface EmployeeDetailResponse extends Omit<EmployeeListItem, "hasAccount"> {
  phone: string | null;
  managerId: string | null;
  managerName: string | null;
  startDate: string | null;
  hasAccount: boolean;
  roleKey: string | null;
  createdAt: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  roleName: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  lastSentAt: string | null;
}

export interface InvitationPreviewResponse {
  organizationName: string;
  organizationLogoUrl: string | null;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  departmentName: string | null;
  roleName: string;
  expiresAt: string;
}

export interface AcceptInvitationResponse {
  organizationId: string;
  organizationName: string;
  employeeId: string;
}

export interface WorkLocationResponse {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

// ---------- Attendance ----------

export interface AttendanceRecordResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  clockInLocationName: string | null;
  clockOutLocationName: string | null;
  status: AttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  workedMinutes: number | null;
}

export interface MyAttendanceTodayResponse {
  workDate: string;
  status: AttendanceStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  clockInLocationName: string | null;
  isLate: boolean;
  lateMinutes: number;
  workedMinutes: number | null;
  canClockIn: boolean;
  canClockOut: boolean;
  blockedReason: string | null;
  locationRequired: boolean;
  timezone: string;
  workDayStart: string;
  workDayEnd: string;
  gracePeriodMinutes: number;
  isWorkingDay: boolean;
  locations: WorkLocationResponse[];
}

export interface AttendanceTodaySummary {
  date: string;
  totalEmployees: number;
  present: number;
  late: number;
  checkedOut: number;
  onLeave: number;
  notCheckedIn: number;
  currentlyWorking: number;
  isWorkingDay: boolean;
}

export interface AttendanceActivityItem {
  employeeId: string;
  employeeName: string;
  photoUrl: string | null;
  departmentName: string | null;
  eventType: AttendanceEventType;
  occurredAt: string;
  status: AttendanceStatus;
  locationName: string | null;
}

export interface SuspiciousEventResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  eventType: AttendanceEventType;
  outcome: AttendanceEventOutcome;
  occurredAt: string;
  distanceMeters: number | null;
  suspicionReason: string | null;
  rejectionReason: string | null;
}

// ---------- Leave ----------

export interface LeaveTypeResponse {
  id: string;
  name: string;
  code: string;
  defaultAnnualDays: number;
  enforceBalance: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface LeaveBalanceResponse {
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: LeaveStatus;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface LeaveCalendarEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}

// ---------- Tasks ----------

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  createdByEmployeeId: string;
  createdByName: string;
  assigneeEmployeeId: string | null;
  assigneeName: string | null;
  assigneePhotoUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  isOverdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummaryResponse {
  total: number;
  toDo: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
}

// ---------- Notifications ----------

export interface NotificationResponse {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferenceResponse {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

// ---------- Audit ----------

export interface AuditLogResponse {
  id: string;
  actorUserId: string | null;
  actorLabel: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: string | null;
  createdAt: string;
}

// ---------- Dashboards ----------

export interface AdminDashboardResponse {
  attendance: AttendanceTodaySummary;
  pendingLeaveRequests: number;
  openTasks: number;
  overdueTasks: number;
  activeEmployees: number;
  suspiciousEventsLast7Days: number;
  recentActivity: AttendanceActivityItem[];
  awaitingApproval: LeaveRequestResponse[];
  recentNotifications: NotificationResponse[];
}

export interface EmployeeDashboardResponse {
  attendance: MyAttendanceTodayResponse;
  tasks: TaskSummaryResponse;
  upcomingTasks: TaskResponse[];
  leaveBalances: LeaveBalanceResponse[];
  recentLeave: LeaveRequestResponse[];
  unreadNotifications: number;
}

export interface ManagerDashboardResponse {
  teamAttendance: AttendanceTodaySummary;
  teamSize: number;
  pendingLeaveRequests: number;
  tasks: TaskSummaryResponse;
  recentActivity: AttendanceActivityItem[];
  awaitingApproval: LeaveRequestResponse[];
}

// ---------- Reports ----------

export interface AttendanceReportRow {
  employeeNumber: string;
  employeeName: string;
  department: string | null;
  workDate: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  workedMinutes: number | null;
  location: string | null;
}

export interface AttendanceReportSummaryRow {
  employeeNumber: string;
  employeeName: string;
  department: string | null;
  daysPresent: number;
  daysLate: number;
  daysOnLeave: number;
  daysAbsent: number;
  totalLateMinutes: number;
  totalWorkedMinutes: number;
}

export interface LeaveReportRow {
  employeeNumber: string;
  employeeName: string;
  department: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  decidedAt: string | null;
}

export interface TaskReportRow {
  title: string;
  assignee: string | null;
  department: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
}

// ---------- Labels ----------

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  [EmployeeStatus.Active]: "Active",
  [EmployeeStatus.Suspended]: "Suspended",
  [EmployeeStatus.Inactive]: "Inactive",
  [EmployeeStatus.Terminated]: "Terminated",
};

export const employmentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.FullTime]: "Full-time",
  [EmploymentType.PartTime]: "Part-time",
  [EmploymentType.Contract]: "Contract",
  [EmploymentType.Intern]: "Intern",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  [AttendanceStatus.NotCheckedIn]: "Not checked in",
  [AttendanceStatus.Present]: "Present",
  [AttendanceStatus.Late]: "Late",
  [AttendanceStatus.CheckedOut]: "Checked out",
  [AttendanceStatus.OnLeave]: "On leave",
  [AttendanceStatus.Absent]: "Absent",
  [AttendanceStatus.OffDay]: "Off day",
};

export const leaveStatusLabels: Record<LeaveStatus, string> = {
  [LeaveStatus.Pending]: "Pending",
  [LeaveStatus.Approved]: "Approved",
  [LeaveStatus.Rejected]: "Rejected",
  [LeaveStatus.Cancelled]: "Cancelled",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.ToDo]: "To do",
  [TaskStatus.InProgress]: "In progress",
  [TaskStatus.Completed]: "Completed",
  [TaskStatus.Cancelled]: "Cancelled",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.Low]: "Low",
  [TaskPriority.Medium]: "Medium",
  [TaskPriority.High]: "High",
  [TaskPriority.Urgent]: "Urgent",
};

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  [NotificationCategory.Attendance]: "Attendance",
  [NotificationCategory.Leave]: "Leave",
  [NotificationCategory.Task]: "Tasks",
  [NotificationCategory.System]: "System",
};
