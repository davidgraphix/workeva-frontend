/**
 * Permission keys, mirrored from the backend's `Permissions` class.
 *
 * These are used for one thing only: deciding what to render. The API enforces
 * every one of them independently, so a user who edits their own permission list
 * in devtools gets a nicer-looking page and exactly the same 403s.
 */
export const Permission = {
  employeeView: "employee.view",
  employeeCreate: "employee.create",
  employeeUpdate: "employee.update",
  employeeDelete: "employee.delete",
  employeeInvite: "employee.invite",

  departmentView: "department.view",
  departmentManage: "department.manage",

  attendanceView: "attendance.view",
  attendanceManage: "attendance.manage",
  attendanceSelf: "attendance.self",

  leaveRequest: "leave.request",
  leaveView: "leave.view",
  leaveApprove: "leave.approve",
  leaveManage: "leave.manage",

  taskView: "task.view",
  taskCreate: "task.create",
  taskAssign: "task.assign",
  taskUpdate: "task.update",

  reportsView: "reports.view",
  settingsManage: "settings.manage",
  locationManage: "location.manage",
  auditView: "audit.view",
  roleManage: "role.manage",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const RoleKey = {
  owner: "owner",
  hrAdmin: "hr_admin",
  manager: "manager",
  employee: "employee",
} as const;

/** Friendly labels for the permission catalogue on the settings screen. */
export const permissionLabels: Record<string, string> = {
  "employee.view": "View employees",
  "employee.create": "Add employees",
  "employee.update": "Edit employees",
  "employee.delete": "Deactivate employees",
  "employee.invite": "Invite people",
  "department.view": "View departments",
  "department.manage": "Manage departments",
  "attendance.view": "View attendance",
  "attendance.manage": "Manage attendance",
  "attendance.self": "Clock in and out",
  "leave.request": "Request leave",
  "leave.view": "View leave",
  "leave.approve": "Approve leave",
  "leave.manage": "Manage leave policy",
  "task.view": "View tasks",
  "task.create": "Create tasks",
  "task.assign": "Assign tasks to others",
  "task.update": "Update tasks",
  "reports.view": "View and export reports",
  "settings.manage": "Manage company settings",
  "location.manage": "Manage work locations",
  "audit.view": "View the audit trail",
  "role.manage": "Manage roles and permissions",
};

/** Groups permissions for display, so the settings screen is readable. */
export const permissionGroups: { label: string; permissions: string[] }[] = [
  { label: "People", permissions: ["employee.view", "employee.create", "employee.update", "employee.delete", "employee.invite"] },
  { label: "Departments", permissions: ["department.view", "department.manage"] },
  { label: "Attendance", permissions: ["attendance.self", "attendance.view", "attendance.manage"] },
  { label: "Leave", permissions: ["leave.request", "leave.view", "leave.approve", "leave.manage"] },
  { label: "Tasks", permissions: ["task.view", "task.create", "task.assign", "task.update"] },
  { label: "Company", permissions: ["reports.view", "settings.manage", "location.manage", "audit.view", "role.manage"] },
];
