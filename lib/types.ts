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

export interface TaskResponse extends TaskProjectFields {
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

/**
 * M2 additions to a task. Every one is optional or defaulted on the wire, so a response from a
 * company that has never turned projects on parses exactly as it did before - which is the same
 * promise the backend contract makes.
 */
export interface TaskProjectFields {
  projectId: string | null;
  projectName: string | null;
  teamId: string | null;
  teamName: string | null;
  parentTaskId: string | null;
  startDate: string | null;
  progressPercent: number;
  subtaskCount: number;
  completedSubtaskCount: number;
  checklistCount: number;
  completedChecklistCount: number;
  commentCount: number;
  attachmentCount: number;
  additionalAssigneeCount: number;
  blockedByCount: number;
  blockingCount: number;
  /** True when something this task depends on is not finished yet. */
  isBlocked: boolean;
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

// ---------- Operations: field reporting ----------

export type OperationLocationType =
  | "Farm" | "ConstructionSite" | "Warehouse" | "Factory" | "Branch" | "FieldSales" | "Logistics" | "Other";

/** Matches the backend enums, which serialise as numbers. */
export enum OperationShift { Morning = 0, Evening = 1 }
export enum OperationReportStatus { Submitted = 0, Approved = 1, Returned = 2 }
export enum OperationAssignmentRole { Worker = 0, Supervisor = 1 }

export interface OperationLocationResponse {
  id: string;
  name: string;
  type: number;
  typeLabel: string;
  code: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  size: number | null;
  sizeUnit: string | null;
  notes: string | null;
  isActive: boolean;
  assignedStaffCount: number;
  createdAt: string;
}

export interface OperationActivityResponse {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  operationLocationId: string | null;
  operationLocationName: string | null;
  isActive: boolean;
}

export interface OperationStaffAssignmentResponse {
  id: string;
  operationLocationId: string;
  operationLocationName: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string | null;
  role: OperationAssignmentRole;
  isActive: boolean;
  assignedAt: string;
}

export interface OperationReportLineResponse {
  id: string;
  activityId: string;
  activityName: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface OperationReportResponse {
  id: string;
  operationLocationId: string;
  operationLocationName: string;
  employeeId: string;
  employeeName: string;
  reportDate: string;
  shift: OperationShift;
  status: OperationReportStatus;
  submittedAt: string;
  notes: string | null;
  reviewedByEmployeeId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  canEdit: boolean;
  canReview: boolean;
  lines: OperationReportLineResponse[];
}

export interface OperationActivityTotal {
  activityId: string;
  activityName: string;
  unit: string;
  quantity: number;
  reportCount: number;
}

export interface OperationLocationTotal {
  operationLocationId: string;
  name: string;
  reportCount: number;
  staffAssigned: number;
  reportsToday: number;
}

export interface OperationsDashboardResponse {
  date: string;
  totalLocations: number;
  activeLocations: number;
  staffAssigned: number;
  expectedReportsToday: number;
  reportsToday: number;
  missingReportsToday: number;
  morningReportsToday: number;
  eveningReportsToday: number;
  pendingReview: number;
  approvedToday: number;
  returnedToday: number;
  activityTotals: OperationActivityTotal[];
  locationTotals: OperationLocationTotal[];
  shiftBreakdown: { shift: OperationShift; count: number }[];
}

export interface MyOperationAssignmentResponse {
  operationLocationId: string;
  operationLocationName: string;
  type: number;
  address: string | null;
  role: OperationAssignmentRole;
  morningSubmitted: boolean;
  eveningSubmitted: boolean;
  morningReportId: string | null;
  eveningReportId: string | null;
  morningStatus: OperationReportStatus | null;
  eveningStatus: OperationReportStatus | null;
}

// ---------- M2: projects and advanced work management ----------

export enum ProjectStatus {
  Planning = 0,
  Active = 1,
  OnHold = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum ProjectMemberRole {
  Member = 0,
  Lead = 1,
  Viewer = 2,
}

export enum EscalationTarget {
  Assignee = 0,
  LineManager = 1,
  ProjectManager = 2,
  ProjectOwner = 3,
  Role = 4,
}

export interface ProjectResponse {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  ownerEmployeeId: string;
  ownerName: string;
  ownerPhotoUrl: string | null;
  managerEmployeeId: string | null;
  managerName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  branchId: string | null;
  branchName: string | null;
  teamId: string | null;
  teamName: string | null;
  isArchived: boolean;
  progressPercent: number;
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  memberCount: number;
  isOverdue: boolean;
  isAtRisk: boolean;
  /** True when the caller reaches this project through a membership row. */
  isMember: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  photoUrl: string | null;
  jobTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  role: ProjectMemberRole;
  isActive: boolean;
  addedAt: string;
  openTaskCount: number;
  overdueTaskCount: number;
}

export interface ProjectActivityResponse {
  id: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  actorEmployeeId: string | null;
  actorName: string | null;
  kind: string;
  summary: string;
  createdAt: string;
}

export interface ChecklistItemResponse {
  id: string;
  taskId: string;
  title: string;
  position: number;
  isDone: boolean;
  completedAt: string | null;
  completedByEmployeeId: string | null;
}

export interface TaskCommentResponse {
  id: string;
  taskId: string;
  authorEmployeeId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  /** True when the caller wrote it, so the UI knows whether to offer an edit. */
  isMine: boolean;
}

export interface TaskDependencyResponse {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTitle: string;
  dependsOnStatus: TaskStatus;
  dependsOnDueDate: string | null;
  /** True while the blocker is still open, which is what makes this task blocked. */
  isBlocking: boolean;
}

export interface TaskAttachmentResponse {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByEmployeeId: string;
  uploadedByName: string;
  isUploaded: boolean;
  createdAt: string;
}

export interface AttachmentUploadTicketResponse {
  attachmentId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface AttachmentDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
}

export interface EscalationRuleResponse {
  id: string;
  daysOverdue: number;
  target: EscalationTarget;
  targetRoleKey: string | null;
  isActive: boolean;
  /** True when this rung is the built-in default rather than a row the organization wrote. */
  isDefault: boolean;
}

export interface TeamWorkloadItem {
  employeeId: string;
  employeeName: string;
  photoUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  openTaskCount: number;
  overdueTaskCount: number;
  projectCount: number;
}

export interface ProjectProgressItem {
  projectId: string;
  name: string;
  status: ProjectStatus;
  progressPercent: number;
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  dueDate: string | null;
  isOverdue: boolean;
  isAtRisk: boolean;
}

export interface ProjectDashboardResponse {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  overdueProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamWorkload: TeamWorkloadItem[];
  projectProgress: ProjectProgressItem[];
  recentActivity: ProjectActivityResponse[];
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: "Planning",
  [ProjectStatus.Active]: "Active",
  [ProjectStatus.OnHold]: "On hold",
  [ProjectStatus.Completed]: "Completed",
  [ProjectStatus.Cancelled]: "Cancelled",
};

export const projectMemberRoleLabels: Record<ProjectMemberRole, string> = {
  [ProjectMemberRole.Member]: "Member",
  [ProjectMemberRole.Lead]: "Lead",
  [ProjectMemberRole.Viewer]: "Viewer",
};

export const escalationTargetLabels: Record<EscalationTarget, string> = {
  [EscalationTarget.Assignee]: "The assignee",
  [EscalationTarget.LineManager]: "Their line manager",
  [EscalationTarget.ProjectManager]: "The project manager",
  [EscalationTarget.ProjectOwner]: "The project owner",
  [EscalationTarget.Role]: "A named role",
};

/**
 * Plain-language labels for the activity feed's stable kind keys. An unknown kind - one written
 * by a newer backend than this build - falls back to the summary the server already wrote, which
 * is why the feed carries a written summary rather than only a key.
 */
export const projectActivityLabels: Record<string, string> = {
  project_created: "Project created",
  project_updated: "Project updated",
  status_changed: "Status changed",
  archived: "Archived",
  restored: "Restored",
  member_added: "Member added",
  member_removed: "Member removed",
  task_added: "Task added",
  task_status_changed: "Task status changed",
  task_reassigned: "Task reassigned",
  task_progress_changed: "Progress updated",
  task_commented: "Comment added",
  task_attachment_added: "File attached",
  task_dependency_added: "Dependency added",
  task_escalated: "Escalated",
};
