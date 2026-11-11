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
    permissions: ["attendance.self", "attendance.view", "department.view", "employee.view", "leave.request", "leave.view", "task.create", "task.update", "task.view",
      "operations.view", "operations.report.create", "operations.report.view",
      // M2: an ordinary employee sees the projects they are on and can take part in their tasks.
      "project.view", "task.comment", "task.attach",
      // M3: an employee may ask about their own figures. Their Self scope is what narrows them.
      "intelligence.view", "intelligence.ask"],
  },
  "owner-token": {
    user: { id: "00000000-0000-0000-0000-0000000000a1", email: "ada.okonkwo@acme-demo.test" },
    roleKey: "owner", roleName: "Company Owner", scope: 2, employeeId: "00000000-0000-0000-0000-0000000000a1",
    fullName: "Ada Okonkwo",
    permissions: ["attendance.manage", "attendance.self", "attendance.view", "audit.view", "department.manage", "department.view",
      "employee.create", "employee.delete", "employee.invite", "employee.update", "employee.view", "leave.approve", "leave.manage",
      "leave.request", "leave.view", "location.manage", "reports.view", "role.manage", "settings.manage", "task.assign", "task.create",
      "task.update", "task.view",
      "operations.view", "operations.location.manage", "operations.staff.assign", "operations.activity.manage",
      "operations.report.create", "operations.report.create_for_others", "operations.report.view",
      "operations.report.review", "operations.report.export",
      // M2: the owner runs the portfolio and sets the escalation ladder.
      "project.view", "project.create", "project.update", "project.archive",
      "project.member.manage", "project.escalation.manage",
      "task.comment", "task.attach", "task.dependency.manage",
      // M3: the owner gets the whole intelligence layer.
      "intelligence.view", "intelligence.ask", "intelligence.alert.manage",
      "intelligence.risk.view", "intelligence.configure"],
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

// =============================================================================================
// M3: Workeva Intelligence fixtures.
// =============================================================================================

/**
 * A figure, in the shape the real API returns.
 *
 * `kind` is the important field: 0 measured, 1 approximate, 2 prediction, 3 unavailable. The
 * fixtures below deliberately include an approximate figure and an unavailable one, so the
 * browser tests exercise the paths where the UI must not show a number as a plain fact or
 * render an unavailable figure as a zero.
 */
function figure(key, title, value, unit, kind = 0, note = null, rows = []) {
  return {
    key,
    title,
    unit,
    value,
    kind,
    periodLabel: "this month",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-10",
    note,
    rows,
  };
}

const workforceFigures = [
  figure("workforce.headcount.active", "Active employees", 24, "employees"),
  figure(
    "attendance.rate",
    "Attendance rate",
    91.4,
    "%",
    1,
    "Expected days are active employees times weekdays in the period. Public holidays are not deducted, so the rate is slightly conservative.",
    [
      { label: "Days attended", value: 412, secondary: null, subjectId: null },
      { label: "Expected working days", value: 451, secondary: null, subjectId: null },
    ],
  ),
  figure("leave.pending.count", "Pending leave requests", 3, "requests"),
  figure(
    "workforce.headcount.by_department",
    "Employees by department",
    null,
    "employees",
    0,
    null,
    [
      { label: "Engineering", value: 14, secondary: null, subjectId: null },
      { label: "Sales", value: 7, secondary: null, subjectId: null },
      { label: "No department", value: 3, secondary: null, subjectId: null },
    ],
  ),
];

const workFigures = [
  figure("project.overdue", "Overdue projects", 2, "projects", 0, "The value against each project is how many days overdue it is.", [
    { label: "Harbour expansion", value: 12, secondary: null, subjectId: null },
  ]),
  figure("task.overdue", "Overdue tasks", 9, "tasks", 0, "Broken down by who the task is assigned to.", [
    { label: "Chiamaka Eze", value: 4, secondary: null, subjectId: null },
    { label: "Unassigned", value: 2, secondary: null, subjectId: null },
  ]),
  // An unavailable figure, so the UI's "not zero" path is exercised in a browser.
  figure(
    "project.delivery_performance",
    "Project delivery performance",
    null,
    "",
    3,
    "No projects were completed in this month, so there is no delivery performance to report for it.",
  ),
];

const managementFigures = [
  figure(
    "management.organization_health",
    "Organization health",
    78.5,
    "out of 100",
    1,
    "An unweighted average of the 3 components listed, each scaled to 100. It is an index for comparing one period with another, not a measurement of anything in itself.",
    [
      { label: "Attendance", value: 91.4, secondary: null, subjectId: null },
      { label: "Task delivery", value: 72, secondary: null, subjectId: null },
      { label: "Project health", value: 72, secondary: null, subjectId: null },
    ],
  ),
  figure("management.attention_summary", "What needs attention", 14, "items", 0, "Each line is a count of outstanding items.", [
    { label: "Overdue projects", value: 2, secondary: null, subjectId: null },
    { label: "Overdue tasks", value: 9, secondary: null, subjectId: null },
    { label: "Pending leave requests", value: 3, secondary: null, subjectId: null },
  ]),
];

function analytics(figures) {
  return {
    periodLabel: "this month",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-10",
    figures,
  };
}

const metricCatalogue = [
  { key: "workforce.headcount.active", title: "Active employees", answers: "How many employees are currently active.", family: "Workforce", supportsPeriod: false },
  { key: "attendance.rate", title: "Attendance rate", answers: "What percentage of expected working days were attended.", family: "Attendance", supportsPeriod: true },
];

const intelligenceAlerts = [
  {
    id: "al-1",
    ruleKey: "project.overdue",
    category: 2,
    severity: 3,
    title: "Harbour expansion is 12 days overdue",
    body: "Harbour expansion was due on 29 Oct 2026 and is still open at 64% complete. Either the work or the date needs to move.",
    status: 0,
    subjectType: "project",
    subjectId: "20000000-0000-0000-0000-000000000001",
    firstSeenAt: iso(daysFromNow(-12)),
    lastSeenAt: iso(now),
    occurrenceCount: 24,
    acknowledgedByEmployeeId: null,
    acknowledgedByName: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNote: null,
    evidence: [
      { label: "Days overdue", value: 12, secondary: null, subjectId: null },
      { label: "Progress %", value: 64, secondary: null, subjectId: null },
      { label: "Overdue tasks", value: 3, secondary: null, subjectId: null },
    ],
  },
  {
    id: "al-2",
    ruleKey: "leave.pending_backlog",
    category: 1,
    severity: 2,
    title: "Chiamaka Eze's leave request has waited 7 days",
    body: "Chiamaka Eze asked for 3 day(s) of leave 7 days ago and the request starts 20 Nov. It still has no decision.",
    status: 1,
    subjectType: "leave_request",
    subjectId: "30000000-0000-0000-0000-000000000001",
    firstSeenAt: iso(daysFromNow(-2)),
    lastSeenAt: iso(now),
    occurrenceCount: 4,
    acknowledgedByEmployeeId: "00000000-0000-0000-0000-0000000000a1",
    acknowledgedByName: "Ada Okonkwo",
    acknowledgedAt: iso(daysFromNow(-1)),
    resolvedAt: null,
    resolutionNote: null,
    evidence: [{ label: "Days waiting", value: 7, secondary: null, subjectId: null }],
  },
];

const intelligenceRisks = [
  {
    id: "rk-1",
    category: "project_delivery",
    subjectType: "project",
    subjectId: "20000000-0000-0000-0000-000000000001",
    subjectLabel: "Harbour expansion",
    score: 81,
    band: 3,
    confidence: 3,
    isInsufficientData: false,
    methodKey: "project_delivery.schedule_vs_progress",
    methodVersion: "1",
    evidence: [
      { label: "Progress %", value: 64, secondary: null, subjectId: null },
      { label: "Tasks", value: 18, secondary: null, subjectId: null },
      { label: "Overdue tasks", value: 3, secondary: null, subjectId: null },
    ],
    explanation:
      "104% of the schedule has passed and 64% of the work is done, a gap of 40 points, with 3 task(s) already overdue. The score weights the schedule gap at 70% and overdue tasks at 30%.",
    recommendedAction:
      "Decide this week whether the date moves or the scope does. Both are better than finding out on the due date.",
    periodStart: "2026-09-01",
    periodEnd: "2026-11-10",
    assessedAt: iso(now),
  },
  {
    // An insufficient-data assessment, so the browser test can assert that no score is shown.
    id: "rk-2",
    category: "attendance_deterioration",
    subjectType: "employee",
    subjectId: "00000000-0000-0000-0000-0000000000e1",
    subjectLabel: "Chiamaka Eze",
    score: 0,
    band: 0,
    confidence: 0,
    isInsufficientData: true,
    methodKey: "attendance_deterioration.period_comparison",
    methodVersion: "1",
    evidence: [],
    explanation:
      "There are fewer than 10 recorded days in one of the two comparison windows, which is not enough to tell a trend from normal variation.",
    recommendedAction: "No action. Assess again once more attendance has been recorded.",
    periodStart: "2026-09-12",
    periodEnd: "2026-11-10",
    assessedAt: iso(now),
  },
];

const intelligenceInsights = [
  {
    id: "in-1",
    kind: "project_slippage",
    metricKey: "project.at_risk",
    title: "Two projects slipped this month",
    summary: "Harbour expansion and Depot refit both passed their due dates without a new one being set.",
    severity: 2,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-10",
    createdAt: iso(now),
  },
];

const alertRules = [
  {
    ruleKey: "attendance.repeated_lateness",
    title: "Repeated lateness",
    description:
      "Raises an alert when the same person is recorded late several times inside the window. Threshold is measured in late arrivals in the window.",
    isEnabled: true,
    threshold: null,
    defaultThreshold: 4,
    windowDays: null,
    defaultWindowDays: 14,
    minimumSeverity: 0,
  },
  {
    ruleKey: "project.overdue",
    title: "Project overdue",
    description:
      "Raises an alert when an open project passes its due date by more than the threshold. Threshold is measured in days overdue.",
    isEnabled: true,
    threshold: 2,
    defaultThreshold: 1,
    windowDays: null,
    defaultWindowDays: 0,
    minimumSeverity: 1,
  },
];

const conversations = [
  {
    id: "cv-1",
    title: "How is attendance this month?",
    lastMessageAt: iso(now),
    messageCount: 2,
    isArchived: false,
  },
];

function conversationDetail(id) {
  return {
    id,
    title: "How is attendance this month?",
    lastMessageAt: iso(now),
    isArchived: false,
    messages: [
      {
        id: "ms-1",
        role: 0,
        body: "How is attendance this month?",
        createdAt: iso(now),
        figures: [],
        providerName: null,
        providerModel: null,
        promptVersion: null,
        outcome: 0,
      },
      {
        id: "ms-2",
        role: 1,
        body:
          "Attendance rate for this month: 91.4%. Expected days are active employees times weekdays in the period. Public holidays are not deducted, so the rate is slightly conservative.",
        createdAt: iso(now),
        figures: [workforceFigures[1]],
        providerName: "workeva.deterministic",
        providerModel: "template",
        promptVersion: "narration.v1",
        outcome: 0,
      },
    ],
  };
}

function assistantStatus(session) {
  return {
    available: true,
    writtenByModel: false,
    providerName: "workeva.deterministic",
    dailyQuestionLimit: 200,
    questionsUsedToday: 7,
    questionsPerMinuteLimit: 6,
    maxQuestionLength: 600,
    availableTopics:
      session.roleKey === "owner"
        ? ["Active employees", "Attendance rate", "Overdue projects", "Workload by person"]
        : ["Active employees", "Pending leave requests"],
  };
}

function askAnswer(body) {
  const question = String(body?.question ?? "");

  // A pay question is refused, exactly as the real assistant refuses it - so the browser test
  // can assert that the refusal renders as an answer rather than as an error.
  if (/salary|pay|wage/i.test(question)) {
    return {
      conversationId: "cv-1",
      messageId: "ms-new",
      answer: "Workeva does not hold pay or payroll data, so there is no figure for that.",
      figures: [],
      outOfScope: true,
      outOfScopeReason: "Workeva does not hold pay or payroll data, so there is no figure for that.",
      providerName: "workeva.deterministic",
      providerModel: null,
      promptVersion: "intent.v1",
      writtenByModel: false,
    };
  }

  return {
    conversationId: "cv-1",
    messageId: "ms-new",
    answer: "Attendance rate for this month: 91.4%.",
    figures: [workforceFigures[1]],
    outOfScope: false,
    outOfScopeReason: null,
    providerName: "workeva.deterministic",
    providerModel: "template",
    promptVersion: "narration.v1",
    writtenByModel: false,
  };
}

function intelligenceDashboard() {
  return {
    periodLabel: "this month",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-10",
    headline: managementFigures,
    workforce: workforceFigures,
    work: workFigures,
    openAlerts: intelligenceAlerts.filter((a) => a.status !== 2),
    topRisks: intelligenceRisks.filter((r) => !r.isInsufficientData),
    recentInsights: intelligenceInsights,
    runs: [
      {
        runKind: "alerts",
        lastStartedAt: iso(daysFromNow(-0.2)),
        lastCompletedAt: iso(daysFromNow(-0.2)),
        lastSucceeded: true,
        itemsProduced: 2,
        failureReason: null,
      },
      {
        runKind: "risk",
        lastStartedAt: iso(daysFromNow(-0.2)),
        lastCompletedAt: iso(daysFromNow(-0.2)),
        lastSucceeded: true,
        itemsProduced: 1,
        failureReason: null,
      },
    ],
    withheld: [],
  };
}

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


// ---------- Operations (field reporting) fixtures ----------
// Per-token state, so one test's submission cannot change another's expectations.
const operationReportsBy = new Map();

const operationLocations = [
  { id: "f1", name: "North Farm", type: 0, typeLabel: "Farm", code: "NF-01", address: "Ikorodu Road", latitude: 6.43, longitude: 3.42,
    size: 12.5, sizeUnit: "hectares", notes: null, isActive: true, assignedStaffCount: 4, createdAt: iso(now) },
  { id: "f2", name: "South Farm", type: 0, typeLabel: "Farm", code: "SF-02", address: "Lekki", latitude: 6.44, longitude: 3.47,
    size: 8, sizeUnit: "hectares", notes: null, isActive: true, assignedStaffCount: 2, createdAt: iso(now) },
];

const operationActivities = [
  { id: "act-harvest", name: "Harvesting", description: null, unit: "kg", operationLocationId: null, operationLocationName: null, isActive: true },
  { id: "act-weeding", name: "Weeding", description: null, unit: "hours", operationLocationId: null, operationLocationName: null, isActive: true },
];

const operationStaff = [
  { id: "sa1", operationLocationId: "f1", operationLocationName: "North Farm", employeeId: "00000000-0000-0000-0000-0000000000e1",
    employeeName: "Chiamaka Eze", jobTitle: "Field Officer", role: 0, isActive: true, assignedAt: iso(now) },
];

const baseOperationReport = {
  id: "or-1", operationLocationId: "f1", operationLocationName: "North Farm",
  employeeId: "00000000-0000-0000-0000-0000000000e1", employeeName: "Chiamaka Eze",
  reportDate: plain(daysFromNow(-1)), shift: 0, status: 0, submittedAt: iso(daysFromNow(-1)),
  notes: "Dry morning", reviewedByEmployeeId: null, reviewedByName: null, reviewedAt: null, reviewNote: null,
  canEdit: false, canReview: false,
  lines: [{ id: "orl-1", activityId: "act-harvest", activityName: "Harvesting", quantity: 120.5, unit: "kg", notes: null }],
};

function operationReportsFor(session, token) {
  const own = session.roleKey === "employee";
  const base = { ...baseOperationReport, canReview: !own && baseOperationReport.status === 0 };
  // Keyed by token, not by employee: every test gets its own fixture state, so one
  // test submitting a report cannot change what the next one sees.
  return [base, ...(operationReportsBy.get(token) ?? [])];
}

function operationAssignments(token) {
  const submitted = operationReportsBy.get(token) ?? [];
  const todays = submitted.filter((r) => r.reportDate === plain(now));
  const morning = todays.find((r) => r.shift === 0);
  const evening = todays.find((r) => r.shift === 1);

  return [
    { operationLocationId: "f1", operationLocationName: "North Farm", type: 0, address: "Ikorodu Road", role: 0,
      morningSubmitted: Boolean(morning), eveningSubmitted: Boolean(evening),
      morningReportId: morning?.id ?? null, eveningReportId: evening?.id ?? null,
      morningStatus: morning?.status ?? null, eveningStatus: evening?.status ?? null },
  ];
}

function submitOperationReport(session, body, token) {
  const activity = operationActivities.find((a) => a.id === body?.lines?.[0]?.activityId) ?? operationActivities[0];
  const report = {
    ...baseOperationReport,
    id: `or-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: session.employeeId,
    employeeName: session.fullName,
    reportDate: body?.reportDate ?? plain(now),
    shift: body?.shift ?? 0,
    status: 0,
    submittedAt: iso(new Date()),
    notes: body?.notes ?? null,
    lines: (body?.lines ?? []).map((line, index) => ({
      id: `orl-${index}`,
      activityId: line.activityId,
      activityName: operationActivities.find((a) => a.id === line.activityId)?.name ?? activity.name,
      quantity: line.quantity,
      unit: operationActivities.find((a) => a.id === line.activityId)?.unit ?? activity.unit,
      notes: line.notes ?? null,
    })),
  };

  const existing = operationReportsBy.get(token) ?? [];
  operationReportsBy.set(token, [report, ...existing]);
  return report;
}

function operationsDashboard() {
  return {
    date: plain(now), totalLocations: 2, activeLocations: 2, staffAssigned: 4,
    expectedReportsToday: 4, reportsToday: 3, missingReportsToday: 5,
    morningReportsToday: 2, eveningReportsToday: 1, pendingReview: 1, approvedToday: 1, returnedToday: 0,
    activityTotals: [
      { activityId: "act-harvest", activityName: "Harvesting", unit: "kg", quantity: 340.5, reportCount: 2 },
      { activityId: "act-weeding", activityName: "Weeding", unit: "hours", quantity: 6, reportCount: 1 },
    ],
    locationTotals: [
      { operationLocationId: "f1", name: "North Farm", reportCount: 12, staffAssigned: 4, reportsToday: 2 },
      { operationLocationId: "f2", name: "South Farm", reportCount: 4, staffAssigned: 2, reportsToday: 1 },
    ],
    shiftBreakdown: [{ shift: 0, count: 2 }, { shift: 1, count: 1 }],
  };
}

// ---------- M2: projects and advanced work management fixtures ----------
//
// The M2 fields are present on every task here, exactly as the API sends them, so the e2e
// build exercises the shape a real response has rather than a trimmed one.

const taskExtras = {
  projectId: null, projectName: null, teamId: null, teamName: null, parentTaskId: null,
  startDate: null, progressPercent: 0, subtaskCount: 0, completedSubtaskCount: 0,
  checklistCount: 0, completedChecklistCount: 0, commentCount: 0, attachmentCount: 0,
  additionalAssigneeCount: 0, blockedByCount: 0, blockingCount: 0, isBlocked: false,
};

const PROJECT_ID = "40000000-0000-0000-0000-000000000001";
const AT_RISK_ID = "40000000-0000-0000-0000-000000000002";

const projects = [
  {
    id: PROJECT_ID, name: "Warehouse rollout", code: "WH-1",
    description: "Open the Ikeja warehouse and move inventory across.",
    status: 1, priority: 2,
    startDate: plain(daysFromNow(-20)), dueDate: plain(daysFromNow(14)), completedAt: null,
    ownerEmployeeId: "m1", ownerName: "Ibrahim Bello", ownerPhotoUrl: null,
    managerEmployeeId: null, managerName: null,
    departmentId: "d1", departmentName: "Engineering",
    branchId: null, branchName: null, teamId: null, teamName: null,
    isArchived: false, progressPercent: 45, taskCount: 4, completedTaskCount: 1,
    overdueTaskCount: 0, memberCount: 3, isOverdue: false, isAtRisk: false, isMember: true,
    createdAt: iso(daysFromNow(-20)), updatedAt: iso(daysFromNow(-1)),
  },
  {
    id: AT_RISK_ID, name: "Payroll migration", code: "PAY-2",
    description: "Move payroll onto the new provider before the quarter closes.",
    status: 1, priority: 3,
    startDate: plain(daysFromNow(-30)), dueDate: plain(daysFromNow(5)), completedAt: null,
    ownerEmployeeId: "m1", ownerName: "Ibrahim Bello", ownerPhotoUrl: null,
    managerEmployeeId: null, managerName: null,
    departmentId: "d1", departmentName: "Engineering",
    branchId: null, branchName: null, teamId: null, teamName: null,
    isArchived: false, progressPercent: 20, taskCount: 3, completedTaskCount: 0,
    overdueTaskCount: 2, memberCount: 2, isOverdue: false, isAtRisk: true, isMember: true,
    createdAt: iso(daysFromNow(-30)), updatedAt: iso(daysFromNow(-2)),
  },
];

const projectTasks = [
  { ...tasks[0], ...taskExtras, id: "50000000-0000-0000-0000-000000000001",
    title: "Survey the Ikeja site", projectId: PROJECT_ID, projectName: "Warehouse rollout",
    status: 2, progressPercent: 100, checklistCount: 2, completedChecklistCount: 2, commentCount: 1 },
  { ...tasks[0], ...taskExtras, id: "50000000-0000-0000-0000-000000000002",
    title: "Fit out the racking", projectId: PROJECT_ID, projectName: "Warehouse rollout",
    status: 1, progressPercent: 40, subtaskCount: 1, completedSubtaskCount: 0, commentCount: 2,
    isBlocked: true, blockedByCount: 1 },
  { ...tasks[0], ...taskExtras, id: "50000000-0000-0000-0000-000000000003",
    title: "Order the shelving", projectId: PROJECT_ID, projectName: "Warehouse rollout",
    parentTaskId: "50000000-0000-0000-0000-000000000002", status: 0, progressPercent: 0 },
  { ...tasks[0], ...taskExtras, id: "50000000-0000-0000-0000-000000000004",
    title: "Move the first pallets", projectId: PROJECT_ID, projectName: "Warehouse rollout",
    status: 0, progressPercent: 0, dueDate: plain(daysFromNow(10)) },
];

const projectMembers = [
  { id: "pm1", employeeId: "m1", employeeName: "Ibrahim Bello", photoUrl: null, jobTitle: "Operations Lead",
    departmentId: "d1", departmentName: "Engineering", role: 1, isActive: true,
    addedAt: iso(daysFromNow(-20)), openTaskCount: 2, overdueTaskCount: 0 },
  { id: "pm2", employeeId: "e1", employeeName: "Chiamaka Eze", photoUrl: null, jobTitle: "Engineer",
    departmentId: "d1", departmentName: "Engineering", role: 0, isActive: true,
    addedAt: iso(daysFromNow(-15)), openTaskCount: 1, overdueTaskCount: 1 },
];

const projectActivity = [
  { id: "pa1", projectId: PROJECT_ID, taskId: null, taskTitle: null, actorEmployeeId: "m1",
    actorName: "Ibrahim Bello", kind: "status_changed",
    summary: "Status changed from planning to active.", createdAt: iso(daysFromNow(-1)) },
  { id: "pa2", projectId: PROJECT_ID, taskId: "50000000-0000-0000-0000-000000000002",
    taskTitle: "Fit out the racking", actorEmployeeId: null, actorName: null, kind: "task_escalated",
    summary: "\"Fit out the racking\" is 2 days overdue and was escalated to the line manager.",
    createdAt: iso(daysFromNow(-2)) },
];

const projectDashboard = {
  totalProjects: 2, activeProjects: 2, completedProjects: 0, atRiskProjects: 1, overdueProjects: 0,
  totalTasks: 7, completedTasks: 1, overdueTasks: 2,
  teamWorkload: [
    { employeeId: "e1", employeeName: "Chiamaka Eze", photoUrl: null, teamId: null, teamName: null,
      openTaskCount: 3, overdueTaskCount: 2, projectCount: 2 },
    { employeeId: "m1", employeeName: "Ibrahim Bello", photoUrl: null, teamId: null, teamName: null,
      openTaskCount: 2, overdueTaskCount: 0, projectCount: 1 },
  ],
  projectProgress: projects.map((p) => ({
    projectId: p.id, name: p.name, status: p.status, progressPercent: p.progressPercent,
    taskCount: p.taskCount, completedTaskCount: p.completedTaskCount,
    overdueTaskCount: p.overdueTaskCount, dueDate: p.dueDate,
    isOverdue: p.isOverdue, isAtRisk: p.isAtRisk,
  })),
  recentActivity: projectActivity,
};

const escalationRules = [
  { id: "00000000-0000-0000-0000-000000000000", daysOverdue: 1, target: 0, targetRoleKey: null, isActive: true, isDefault: true },
  { id: "00000000-0000-0000-0000-000000000000", daysOverdue: 2, target: 1, targetRoleKey: null, isActive: true, isDefault: true },
  { id: "00000000-0000-0000-0000-000000000000", daysOverdue: 3, target: 2, targetRoleKey: null, isActive: true, isDefault: true },
  { id: "00000000-0000-0000-0000-000000000000", daysOverdue: 5, target: 4, targetRoleKey: "hr_admin", isActive: true, isDefault: true },
];
// `query` is the request URL's search params. The project page asks the V1 task endpoint for
// one project's tasks, so the fixture has to see the filter rather than only the path.
function route(method, path, session, body, token, query) {
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
    "GET /api/operations/my-assignments": () => operationAssignments(token),
    "GET /api/operations/dashboard": () => operationsDashboard(),
    "GET /api/operations/locations": () => paged(operationLocations),
    "GET /api/operations/activities": () => operationActivities,
    "GET /api/operations/staff": () => operationStaff,
    "GET /api/operations/reports": () => paged(operationReportsFor(session, token)),
    "GET /api/operations/reports/mine": () => paged(operationReportsFor(session, token)),
    "POST /api/operations/reports": () => submitOperationReport(session, body, token),
    "POST /api/operations/locations": () => ({ ...operationLocations[0], id: "f-new", name: body?.name ?? "New location", assignedStaffCount: 0 }),
    "POST /api/operations/activities": () => ({ id: "act-new", name: body?.name ?? "New activity", description: body?.description ?? null, unit: body?.unit ?? "kg", operationLocationId: body?.operationLocationId ?? null, operationLocationName: null, isActive: true }),
    "POST /api/operations/staff": () => ({ ...operationStaff[0], id: "sa-new", employeeId: body?.employeeId ?? operationStaff[0].employeeId, role: body?.role ?? 0 }),

    // M3: Workeva Intelligence. Every figure carries its period, its kind and its note, because
    // that is what the real API returns and a mock that dropped them would let a page ship that
    // renders an approximation as a fact.
    "GET /api/v2/intelligence/dashboard": () => intelligenceDashboard(),
    "GET /api/v2/intelligence/alerts": () => paged(intelligenceAlerts),
    "GET /api/v2/intelligence/risks": () => paged(intelligenceRisks),
    "GET /api/v2/intelligence/insights": () => intelligenceInsights,
    "GET /api/v2/intelligence/analytics/workforce": () => analytics(workforceFigures),
    "GET /api/v2/intelligence/analytics/work": () => analytics(workFigures),
    "GET /api/v2/intelligence/analytics/management": () => analytics(managementFigures),
    "GET /api/v2/intelligence/analytics/catalogue": () => metricCatalogue,
    "GET /api/v2/intelligence/settings/alert-rules": () => alertRules,
    "GET /api/v2/intelligence/ask/status": () => assistantStatus(session),
    "GET /api/v2/intelligence/ask/conversations": () => paged(conversations),
    "POST /api/v2/intelligence/ask": () => askAnswer(body),

    "GET /api/tasks": () => paged(tasks.map((t) => ({ ...taskExtras, ...t }))),
    "GET /api/tasks/summary": () => ({ total: 2, toDo: 1, inProgress: 1, completed: 0, cancelled: 0, overdue: 1, dueToday: 0 }),

    // M2: projects and advanced work management.
    "GET /api/v2/projects": () => paged(projects),
    "GET /api/v2/projects/dashboard": () => projectDashboard,
    "GET /api/v2/escalation-rules": () => escalationRules,
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

  // Tasks on a project come from the V1 task endpoint with a filter, exactly as the real page
  // asks for them - so this has to be decided before the exact-path lookup below, which would
  // otherwise answer every /api/tasks request with the unfiltered list.
  if (method === "GET" && path === "/api/tasks" && query?.get("projectId")) return paged(projectTasks);

  // An exact route then wins over the id patterns further down. Without this, a pattern like
  // /api/v2/projects/{id} swallows /api/v2/projects/dashboard and the page gets a 404 for a
  // route that is right there in the map.
  const exact = routes[`${method} ${path}`];
  if (exact) return exact();

  if (method === "GET" && path.startsWith("/api/employees/") && path.endsWith("/leave-balances")) return balances;
  if (method === "GET" && path.startsWith("/api/employees/")) {
    const found = employees.find((e) => path.endsWith(e.id)) ?? employee;
    return { ...found, phone: "+234 800 000 0000", managerId: null, managerName: "Ibrahim Bello", startDate: plain(daysFromNow(-400)), roleKey: session.roleKey, createdAt: iso(now) };
  }
  if (method === "POST" && /^\/api\/tasks\/[^/]+\/status$/.test(path)) return { ...taskExtras, ...tasks[0], status: body?.status ?? 1 };
  if (method === "POST" && /^\/api\/notifications\//.test(path)) return undefined;

  // ---- M3 routes with an id in the path.

  if (method === "GET" && /^\/api\/v2\/intelligence\/ask\/conversations\/[^/]+$/.test(path)) {
    const id = path.split("/").pop();
    return conversationDetail(id);
  }

  if (method === "POST" && /^\/api\/v2\/intelligence\/alerts\/[^/]+\/(acknowledge|resolve)$/.test(path)) {
    const resolving = path.endsWith("/resolve");
    const id = path.split("/")[5];
    const found = intelligenceAlerts.find((a) => a.id === id) ?? intelligenceAlerts[0];

    return {
      ...found,
      status: resolving ? 2 : 1,
      acknowledgedAt: iso(now),
      acknowledgedByName: "Ada Okonkwo",
      resolvedAt: resolving ? iso(now) : null,
      resolutionNote: resolving ? (body?.note ?? null) : null,
    };
  }

  if (method === "PUT" && /^\/api\/v2\/intelligence\/ask\/conversations\/[^/]+\/archive$/.test(path)) {
    return { ...conversations[0], isArchived: query?.get("archived") === "true" };
  }

  if (method === "DELETE" && /^\/api\/v2\/intelligence\/ask\/conversations\/[^/]+$/.test(path)) {
    return undefined;
  }

  if (method === "PUT" && path === "/api/v2/intelligence/settings/alert-rules") {
    const found = alertRules.find((r) => r.ruleKey === body?.ruleKey) ?? alertRules[0];

    return {
      ...found,
      isEnabled: body?.isEnabled ?? found.isEnabled,
      threshold: body?.threshold ?? null,
      windowDays: body?.windowDays ?? null,
      minimumSeverity: body?.minimumSeverity ?? found.minimumSeverity,
    };
  }

  // ---- M2 routes with an id in the path.

  if (method === "GET" && /^\/api\/v2\/projects\/[^/]+$/.test(path)) {
    const found = projects.find((p) => path.endsWith(p.id));
    return found ?? undefined;
  }

  if (method === "GET" && /^\/api\/v2\/projects\/[^/]+\/members$/.test(path)) return projectMembers;

  if (method === "GET" && /^\/api\/v2\/projects\/[^/]+\/activity$/.test(path)) return paged(projectActivity);

  if (method === "GET" && /^\/api\/v2\/tasks\/[^/]+\/checklist$/.test(path)) {
    return [
      { id: "c1", taskId: path.split("/")[4], title: "Measure the bays", position: 10, isDone: true,
        completedAt: iso(daysFromNow(-1)), completedByEmployeeId: "m1" },
      { id: "c2", taskId: path.split("/")[4], title: "Confirm the load rating", position: 20, isDone: false,
        completedAt: null, completedByEmployeeId: null },
    ];
  }

  if (method === "GET" && /^\/api\/v2\/tasks\/[^/]+\/comments$/.test(path)) {
    return [
      { id: "tc1", taskId: path.split("/")[4], authorEmployeeId: "m1", authorName: "Ibrahim Bello",
        authorPhotoUrl: null, body: "Racking supplier confirmed for Tuesday.",
        createdAt: iso(daysFromNow(-1)), editedAt: null, isMine: false },
    ];
  }

  if (method === "GET" && /^\/api\/v2\/tasks\/[^/]+\/dependencies$/.test(path)) {
    return [
      { id: "td1", taskId: path.split("/")[4], dependsOnTaskId: "50000000-0000-0000-0000-000000000001",
        dependsOnTitle: "Survey the Ikeja site", dependsOnStatus: 2,
        dependsOnDueDate: plain(daysFromNow(-3)), isBlocking: false },
    ];
  }

  // Attachments are deliberately unavailable, because the deployment this mock stands in for has
  // no object storage - which is the state a development environment is actually in. The page is
  // expected to explain it rather than fail.
  if (method === "GET" && /^\/api\/v2\/tasks\/[^/]+\/attachments$/.test(path)) return "storage-unavailable";

  if (method === "GET" && /^\/api\/v2\/tasks\/[^/]+\/activity$/.test(path)) return projectActivity;

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

  const result = route(req.method, url.pathname, session, body, token, url.searchParams);

  // The one sentinel this mock uses: object storage is not configured, which is a supported
  // state the API reports as 503 and the page is expected to explain rather than fail.
  if (result === "storage-unavailable") {
    return send(503, {
      title: "Not available",
      detail: "File storage isn't configured for this deployment, so attachments aren't available yet.",
      status: 503,
    });
  }
  if (result === undefined && !(req.method === "POST" && url.pathname.startsWith("/api/notifications/"))) {
    return send(404, { title: "Not found", detail: `Mock has no fixture for ${req.method} ${url.pathname}`, status: 404 });
  }
  return send(req.method === "POST" && url.pathname === "/api/leave/requests" ? 201 : result === undefined ? 204 : 200, result);
}).listen(PORT, "127.0.0.1", () => console.log(`mock backend on http://127.0.0.1:${PORT}`));
