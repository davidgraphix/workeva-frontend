// Test-only stand-in for Supabase Auth and the Workeva API, used by the "ui" Playwright
// projects to render signed-in screens in a real browser without real infrastructure.
//
// It verifies nothing about security - that is the job of the API's integration tests,
// the RLS tests and the staging E2E suite. It exists so that layout, mobile behaviour and
// accessibility of authenticated pages can be checked locally and in CI.
//
// Never deployed. Bound to 127.0.0.1 only.

import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 54399);
const now = new Date();
const iso = (d) => d.toISOString();
const plain = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000);

const org = { organizationId: "00000000-0000-0000-0000-00000000000a", organizationName: "Acme Demo Ltd", logoUrl: null };

const users = {
  "employee-token": {
    user: { id: "00000000-0000-0000-0000-0000000000e1", email: "chiamaka.eze@acme-demo.test" },
    roleKey: "employee", roleName: "Employee", scope: 0, employeeId: "00000000-0000-0000-0000-0000000000e1",
    fullName: "Chiamaka Eze",
    permissions: ["attendance.self", "attendance.view", "department.view", "employee.view", "leave.request", "leave.view", "task.create", "task.update", "task.view"],
  },
  "owner-token": {
    user: { id: "00000000-0000-0000-0000-0000000000a1", email: "ada.okonkwo@acme-demo.test" },
    roleKey: "owner", roleName: "Company Owner", scope: 2, employeeId: "00000000-0000-0000-0000-0000000000a1",
    fullName: "Ada Okonkwo",
    permissions: ["attendance.manage", "attendance.self", "attendance.view", "audit.view", "department.manage", "department.view",
      "employee.create", "employee.delete", "employee.invite", "employee.update", "employee.view", "leave.approve", "leave.manage",
      "leave.request", "leave.view", "location.manage", "reports.view", "role.manage", "settings.manage", "task.assign", "task.create",
      "task.update", "task.view"],
  },
};

const location = { id: "10000000-0000-0000-0000-000000000001", name: "Lagos HQ", address: "Victoria Island, Lagos", latitude: 6.4281, longitude: 3.4219, radiusMeters: 150, isActive: true };

// Clock-in state per session token, so parallel browser projects never share it.
const clockedInBy = new Map();

const today = (token) => { const clockedIn = clockedInBy.get(token) ?? null; return {
  workDate: plain(now), status: clockedIn ? 1 : 0, clockInAt: clockedIn, clockOutAt: null,
  clockInLocationName: clockedIn ? "Lagos HQ" : null, isLate: false, lateMinutes: 0, workedMinutes: null,
  canClockIn: !clockedIn, canClockOut: Boolean(clockedIn), blockedReason: null, locationRequired: true,
  timezone: "Africa/Lagos", workDayStart: "08:00:00", workDayEnd: "17:00:00", gracePeriodMinutes: 15, isWorkingDay: true,
  locations: [location],
}; };

const paged = (items) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: items.length ? 1 : 0, hasNextPage: false });

const tasks = [
  { id: "20000000-0000-0000-0000-000000000001", title: "Prepare September sales report", description: "Pull figures from the dashboard",
    createdByEmployeeId: "m1", createdByName: "Ibrahim Bello", assigneeEmployeeId: users["employee-token"].employeeId,
    assigneeName: "Chiamaka Eze", assigneePhotoUrl: null, departmentId: null, departmentName: "Engineering", priority: 2, status: 0,
    dueDate: plain(daysFromNow(2)), isOverdue: false, completedAt: null, createdAt: iso(daysFromNow(-3)), updatedAt: iso(daysFromNow(-3)) },
  { id: "20000000-0000-0000-0000-000000000002", title: "Review onboarding checklist for new starters", description: null,
    createdByEmployeeId: "m1", createdByName: "Ibrahim Bello", assigneeEmployeeId: users["employee-token"].employeeId,
    assigneeName: "Chiamaka Eze", assigneePhotoUrl: null, departmentId: null, departmentName: null, priority: 3, status: 1,
    dueDate: plain(daysFromNow(-1)), isOverdue: true, completedAt: null, createdAt: iso(daysFromNow(-6)), updatedAt: iso(daysFromNow(-1)) },
];

const balances = [
  { leaveTypeId: "l1", leaveTypeName: "Annual Leave", year: now.getFullYear(), allocatedDays: 20, usedDays: 7, pendingDays: 2, remainingDays: 11 },
  { leaveTypeId: "l2", leaveTypeName: "Sick Leave", year: now.getFullYear(), allocatedDays: 10, usedDays: 1, pendingDays: 0, remainingDays: 9 },
  { leaveTypeId: "l3", leaveTypeName: "Casual Leave", year: now.getFullYear(), allocatedDays: 5, usedDays: 0, pendingDays: 0, remainingDays: 5 },
];

const leaveRequests = [
  { id: "30000000-0000-0000-0000-000000000001", employeeId: users["employee-token"].employeeId, employeeName: "Chiamaka Eze",
    departmentName: "Engineering", leaveTypeId: "l1", leaveTypeName: "Annual Leave", startDate: plain(daysFromNow(20)),
    endDate: plain(daysFromNow(21)), daysCount: 2, reason: "Family wedding", status: 0, decidedByName: null, decidedAt: null,
    decisionNote: null, createdAt: iso(daysFromNow(-1)) },
];

const notifications = [
  { id: "40000000-0000-0000-0000-000000000001", category: 2, title: "You have a new task", body: "Prepare September sales report", linkPath: "/my-tasks", isRead: false, createdAt: iso(daysFromNow(0)) },
  { id: "40000000-0000-0000-0000-000000000002", category: 1, title: "Your Casual Leave request was approved", body: "4 Sep to 4 Sep (1 days).", linkPath: "/my-leave", isRead: true, createdAt: iso(daysFromNow(-5)) },
];

const employees = [
  { id: users["owner-token"].employeeId, employeeNumber: "EMP-001", firstName: "Ada", lastName: "Okonkwo", fullName: "Ada Okonkwo", email: "ada.okonkwo@acme-demo.test", photoUrl: null, jobTitle: "Company Owner", departmentId: null, departmentName: null, status: 0, employmentType: 0, hasAccount: true },
  { id: users["employee-token"].employeeId, employeeNumber: "EMP-003", firstName: "Chiamaka", lastName: "Eze", fullName: "Chiamaka Eze", email: "chiamaka.eze@acme-demo.test", photoUrl: null, jobTitle: "Software Engineer", departmentId: "d1", departmentName: "Engineering", status: 0, employmentType: 0, hasAccount: true },
  { id: "00000000-0000-0000-0000-0000000000e2", employeeNumber: "EMP-004", firstName: "Tunde", lastName: "Adeyemi", fullName: "Tunde Adeyemi", email: "tunde.adeyemi@acme-demo.test", photoUrl: null, jobTitle: "Operations Analyst with a deliberately long job title", departmentId: "d2", departmentName: "Operations", status: 1, employmentType: 2, hasAccount: false },
];

const summary = { date: plain(now), totalEmployees: 42, present: 31, late: 4, checkedOut: 2, onLeave: 3, notCheckedIn: 4, currentlyWorking: 29, isWorkingDay: true };
const activity = [{ employeeId: "e1", employeeName: "Chiamaka Eze", photoUrl: null, departmentName: "Engineering", eventType: 0, occurredAt: iso(now), status: 1, locationName: "Lagos HQ" }];

function me(session) {
  return {
    userId: session.user.id, email: session.user.email, fullName: session.fullName, avatarUrl: null, isPlatformAdmin: false,
    memberships: [{ ...org, roleKey: session.roleKey, roleName: session.roleName, status: 1 }],
    active: { ...org, timezone: "Africa/Lagos", onboardingCompleted: true, roleKey: session.roleKey, roleName: session.roleName,
      scope: session.scope, employeeId: session.employeeId, employeeNumber: "EMP-003", employeeFullName: session.fullName,
      employeeStatus: 0, permissions: session.permissions },
    needsOrganization: false, accessIssue: null,
  };
}

function route(method, path, session, body, token) {
  const employee = employees.find((e) => e.id === session.employeeId);
  const routes = {
    "GET /api/me": () => me(session),
    "GET /api/dashboard/employee": () => ({ attendance: today(token), tasks: { total: 2, toDo: 1, inProgress: 1, completed: 0, cancelled: 0, overdue: 1, dueToday: 0 }, upcomingTasks: tasks, leaveBalances: balances, recentLeave: leaveRequests, unreadNotifications: 1 }),
    "GET /api/dashboard/admin": () => ({ attendance: summary, pendingLeaveRequests: 1, openTasks: 12, overdueTasks: 2, activeEmployees: 42, suspiciousEventsLast7Days: 1, recentActivity: activity, awaitingApproval: leaveRequests, recentNotifications: notifications }),
    "GET /api/attendance/today": () => today(token),
    "POST /api/attendance/clock-in": () => { const clockedIn = iso(new Date()); clockedInBy.set(token, clockedIn); return { id: "a1", employeeId: session.employeeId, employeeName: session.fullName, departmentName: "Engineering", workDate: plain(now), clockInAt: clockedIn, clockOutAt: null, clockInLocationName: "Lagos HQ", clockOutLocationName: null, status: 1, isLate: false, lateMinutes: 0, workedMinutes: null }; },
    "GET /api/attendance/me": () => paged([{ id: "a0", employeeId: session.employeeId, employeeName: session.fullName, departmentName: "Engineering", workDate: plain(daysFromNow(-1)), clockInAt: iso(daysFromNow(-1)), clockOutAt: iso(daysFromNow(-0.6)), clockInLocationName: "Lagos HQ", clockOutLocationName: "Lagos HQ", status: 3, isLate: false, lateMinutes: 0, workedMinutes: 534 }]),
    "GET /api/attendance": () => paged([]),
    "GET /api/attendance/summary": () => summary,
    "GET /api/attendance/activity": () => activity,
    "GET /api/attendance/suspicious": () => paged([]),
    "GET /api/leave/balances/me": () => balances,
    "GET /api/leave/requests/me": () => paged(leaveRequests),
    "GET /api/leave/requests": () => paged(leaveRequests),
    "GET /api/leave/types": () => balances.map((b) => ({ id: b.leaveTypeId, name: b.leaveTypeName, code: b.leaveTypeName.split(" ")[0].toLowerCase(), defaultAnnualDays: b.allocatedDays, enforceBalance: true, requiresApproval: true, isActive: true })),
    "GET /api/leave/calendar": () => [],
    "POST /api/leave/requests": () => ({ ...leaveRequests[0], id: "30000000-0000-0000-0000-000000000009", reason: body?.reason ?? "" }),
    "GET /api/tasks": () => paged(tasks),
    "GET /api/tasks/summary": () => ({ total: 2, toDo: 1, inProgress: 1, completed: 0, cancelled: 0, overdue: 1, dueToday: 0 }),
    "GET /api/notifications": () => paged(notifications),
    "GET /api/notifications/unread-count": () => ({ count: 1 }),
    "GET /api/me/notification-preferences": () => [0, 1, 2, 3].map((category) => ({ category, inAppEnabled: true, emailEnabled: true })),
    "GET /api/employees": () => paged(employees),
    "GET /api/departments": () => [{ id: "d1", name: "Engineering", description: "Builds the product", managerEmployeeId: null, managerName: "Ibrahim Bello", employeeCount: 12, isArchived: false, createdAt: iso(now) }],
    "GET /api/invitations": () => [],
    "GET /api/roles": () => [],
    "GET /api/members": () => [],
    "GET /api/locations": () => [location],
    "GET /api/organizations/current": () => ({ id: org.organizationId, name: org.organizationName, slug: "acme", logoUrl: null, email: null, phone: null, country: "Nigeria", state: "Lagos", city: "Lagos", address: null, timezone: "Africa/Lagos", status: 0, onboardingCompleted: true, createdAt: iso(now) }),
    "GET /api/settings": () => ({ workingDaysMask: 31, workDayStart: "08:00:00", workDayEnd: "17:00:00", gracePeriodMinutes: 15, requireLocationForAttendance: true, defaultRadiusMeters: 100, suspiciousDistanceMeters: 2000, suspiciousFailedAttemptsThreshold: 3, enforceLeaveBalance: true, notifyManagersOnClockIn: true, notifyManagersOnLateArrival: true, emailNotificationsEnabled: true }),
    "GET /api/audit": () => paged([]),
    "GET /api/audit/actions": () => [],
    "GET /api/reports/attendance/summary": () => [],
  };

  if (method === "GET" && path.startsWith("/api/employees/") && path.endsWith("/leave-balances")) return balances;
  if (method === "GET" && path.startsWith("/api/employees/")) {
    const found = employees.find((e) => path.endsWith(e.id)) ?? employee;
    return { ...found, phone: "+234 800 000 0000", managerId: null, managerName: "Ibrahim Bello", startDate: plain(daysFromNow(-400)), roleKey: session.roleKey, createdAt: iso(now) };
  }
  if (method === "POST" && /^\/api\/tasks\/[^/]+\/status$/.test(path)) return { ...tasks[0], status: body?.status ?? 1 };
  if (method === "POST" && /^\/api\/notifications\//.test(path)) return undefined;

  return routes[`${method} ${path}`]?.();
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "authorization,content-type,x-organization-id,apikey,x-client-info,x-supabase-api-version");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  // Tokens look like "employee-token" or "employee-token:<unique>"; the prefix selects the fixture user.
  const session = users[token.split(":")[0]];

  let body;
  if (req.method === "POST" || req.method === "PUT") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { body = {}; }
  }

  const send = (status, payload) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(payload === undefined ? "" : JSON.stringify(payload));
  };

  if (url.pathname === "/auth/v1/user") {
    return session
      ? send(200, { id: session.user.id, aud: "authenticated", role: "authenticated", email: session.user.email, app_metadata: {}, user_metadata: {}, created_at: iso(now) })
      : send(401, { code: 401, msg: "invalid JWT" });
  }

  if (!url.pathname.startsWith("/api/")) return send(404, {});
  if (!session) return send(401, { title: "Unauthorized", status: 401 });

  const result = route(req.method, url.pathname, session, body, token);
  if (result === undefined && !(req.method === "POST" && url.pathname.startsWith("/api/notifications/"))) {
    return send(404, { title: "Not found", detail: `Mock has no fixture for ${req.method} ${url.pathname}`, status: 404 });
  }
  return send(req.method === "POST" && url.pathname === "/api/leave/requests" ? 201 : result === undefined ? 204 : 200, result);
}).listen(PORT, "127.0.0.1", () => console.log(`mock backend on http://127.0.0.1:${PORT}`));
