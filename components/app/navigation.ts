import {
  CalendarDays,
  Building2,
  ClipboardList,
  Clock,
  FileBarChart,
  LayoutDashboard,
  Bell,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Permission } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Shown only when the caller holds at least one of these. UX only. */
  requires?: string[];
  /** Hidden unless the caller has an employee record. */
  requiresEmployee?: boolean;
}

/**
 * One navigation model for everybody, filtered by permission.
 *
 * Rather than three hard-coded menus, each item declares what it needs. A
 * manager therefore sees the manager's subset automatically, and a role whose
 * permissions are edited in settings gets a matching menu without a code change.
 */
export const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

  // Personal, for anyone with an employee record.
  { href: "/my-attendance", label: "My attendance", icon: Clock, requiresEmployee: true, requires: [Permission.attendanceSelf] },
  { href: "/my-leave", label: "My leave", icon: CalendarDays, requiresEmployee: true, requires: [Permission.leaveRequest] },
  { href: "/my-tasks", label: "My tasks", icon: ClipboardList, requiresEmployee: true, requires: [Permission.taskView] },

  // Company-wide.
  { href: "/employees", label: "Employees", icon: Users, requires: [Permission.employeeCreate, Permission.employeeInvite, Permission.employeeUpdate] },
  { href: "/departments", label: "Departments", icon: Building2, requires: [Permission.departmentManage] },
  { href: "/attendance", label: "Attendance", icon: Clock, requires: [Permission.attendanceView, Permission.attendanceManage] },
  { href: "/leave", label: "Leave", icon: CalendarDays, requires: [Permission.leaveApprove, Permission.leaveManage] },
  { href: "/tasks", label: "Tasks", icon: ClipboardList, requires: [Permission.taskAssign, Permission.taskCreate] },
  { href: "/reports", label: "Reports", icon: FileBarChart, requires: [Permission.reportsView] },
  { href: "/audit", label: "Audit trail", icon: ShieldCheck, requires: [Permission.auditView] },
];

export const secondaryNavigation: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "My profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings, requires: [Permission.settingsManage, Permission.roleManage, Permission.locationManage, Permission.leaveManage] },
];

/** The four destinations that matter on a phone, for the bottom bar. */
export const mobileNavigation: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/my-attendance", label: "Attendance", icon: Clock, requiresEmployee: true },
  { href: "/my-tasks", label: "Tasks", icon: ClipboardList, requiresEmployee: true },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export function visibleItems(
  items: NavItem[],
  can: (permission: string) => boolean,
  hasEmployeeRecord: boolean,
): NavItem[] {
  return items.filter((item) => {
    if (item.requiresEmployee && !hasEmployeeRecord) return false;
    if (!item.requires) return true;
    return item.requires.some((permission) => can(permission));
  });
}
