import { afterEach, describe, expect, it, vi } from "vitest";

import { describeAccessIssue, sessionGate } from "@/lib/access";
import { api, ApiError, query } from "@/lib/api";
import { formatDuration, formatPlainDate, formatWorkingDays, initials, toggleDayInMask } from "@/lib/format";
import { isPublicPath, safeRedirectPath } from "@/lib/routes";
import { visibleItems, primaryNavigation, secondaryNavigation } from "@/components/app/navigation";
import { withFilters } from "@/hooks/use-api";
import { Permission } from "@/lib/permissions";
import { AccessScope, type MeResponse } from "@/lib/types";

function me(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    userId: "u1",
    email: "a@b.test",
    fullName: "A B",
    avatarUrl: null,
    isPlatformAdmin: false,
    memberships: [],
    active: null,
    needsOrganization: false,
    accessIssue: null,
    ...overrides,
  };
}

describe("session gate (auth state)", () => {
  it("waits while the session is loading", () => {
    expect(sessionGate(null, true).kind).toBe("loading");
  });

  it("sends a user with no organization to onboarding", () => {
    expect(sessionGate(me({ needsOrganization: true }), false).kind).toBe("onboarding");
  });

  it("explains a suspended employee instead of showing the app", () => {
    const gate = sessionGate(
      me({
        memberships: [{ organizationId: "o1", organizationName: "Co", logoUrl: null, roleKey: "employee", roleName: "Employee", status: 1 }],
        accessIssue: "employee_inactive",
      }),
      false,
    );
    expect(gate.kind).toBe("access-issue");
    expect(gate.kind === "access-issue" && gate.title).toMatch(/paused/i);
  });

  it("opens the app only with an active membership", () => {
    const active = me({
      active: {
        organizationId: "o1", organizationName: "Co", logoUrl: null, timezone: "Africa/Lagos", onboardingCompleted: true,
        roleKey: "employee", roleName: "Employee", scope: AccessScope.Self, employeeId: "e1", employeeNumber: "EMP-1",
        employeeFullName: "A B", employeeStatus: 0, permissions: [],
      },
    });
    expect(sessionGate(active, false).kind).toBe("app");
  });

  it("has a human message for every known access issue", () => {
    for (const code of ["employee_inactive", "organization_forbidden", "organization_ambiguous", null]) {
      expect(describeAccessIssue(code).message.length).toBeGreaterThan(20);
    }
  });
});

describe("protected routes and redirects", () => {
  it("treats only the sign-in journey as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/invite")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/employees/123")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });

  it("refuses open redirects", () => {
    expect(safeRedirectPath("/my-tasks")).toBe("/my-tasks");
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });
});

describe("permission-driven navigation (UX only)", () => {
  const employee = new Set<string>([Permission.attendanceSelf, Permission.leaveRequest, Permission.leaveView,
    Permission.taskView, Permission.taskCreate, Permission.taskUpdate, Permission.employeeView, Permission.attendanceView]);
  const manager = new Set<string>([...employee, Permission.taskAssign, Permission.leaveApprove, Permission.reportsView]);
  const owner = new Set<string>(Object.values(Permission));

  const labels = (permissions: Set<string>, hasEmployee = true) =>
    visibleItems([...primaryNavigation, ...secondaryNavigation], (p) => permissions.has(p), hasEmployee).map((i) => i.label);

  it("gives an employee only personal areas", () => {
    const items = labels(employee);
    expect(items).toEqual(expect.arrayContaining(["Dashboard", "My attendance", "My leave", "My tasks", "Notifications", "My profile"]));
    for (const adminOnly of ["Employees", "Departments", "Reports", "Audit trail", "Settings", "Leave"]) {
      expect(items).not.toContain(adminOnly);
    }
  });

  it("gives a manager team areas but not company administration", () => {
    const items = labels(manager);
    expect(items).toEqual(expect.arrayContaining(["Tasks", "Leave", "Reports", "Attendance"]));
    for (const adminOnly of ["Departments", "Audit trail", "Settings"]) expect(items).not.toContain(adminOnly);
  });

  it("gives an owner everything", () => {
    expect(labels(owner)).toEqual(expect.arrayContaining(["Employees", "Departments", "Audit trail", "Settings", "Reports"]));
  });

  it("hides personal attendance for someone with no employee record", () => {
    expect(labels(owner, false)).not.toContain("My attendance");
  });
});

describe("query key prefixes", () => {
  it("drops an absent filter so invalidation matches every filtered list", () => {
    expect(withFilters("tasks", undefined)).toEqual(["tasks"]);
    expect(withFilters("leave", "requests", undefined)).toEqual(["leave", "requests"]);
    expect(withFilters("tasks", { page: 2 })).toEqual(["tasks", { page: 2 }]);
  });
});

describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the bearer token and organization hint, and parses JSON", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api<{ ok: boolean }>("/api/tasks", { token: "jwt", organizationId: "org-1" });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/api/tasks");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt");
    expect(headers["X-Organization-Id"]).toBe("org-1");
  });

  it("surfaces the server's human message and field errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      title: "Validation failed", detail: "Please check the highlighted fields.", status: 400,
      errors: { endDate: ["The end date can't be before the start date."] },
    }), { status: 400 })));

    const error = (await api("/api/leave/requests", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Please check the highlighted fields.");
    expect(error.fieldErrors?.endDate?.[0]).toMatch(/end date/);
    expect(error.isRetryable).toBe(false);
  });

  it("gives a safe message for an expired session and a non-JSON error body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>proxy error</html>", { status: 401 })));
    const error = (await api("/api/me").catch((e: unknown) => e)) as ApiError;
    expect(error.isUnauthorized).toBe(true);
    expect(error.message).toMatch(/session has expired/i);
    expect(error.message).not.toMatch(/html/);
  });

  it("reports a network failure as retryable without pretending success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const error = (await api("/api/attendance/clock-in", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(0);
    expect(error.isRetryable).toBe(true);
    expect(error.message).toMatch(/couldn't reach Workeva/i);
  });

  it("builds query strings without empty values", () => {
    expect(query({ page: 1, search: "", status: undefined, onlyMine: true })).toBe("?page=1&onlyMine=true");
    expect(query({})).toBe("");
  });
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(534)).toBe("8h 54m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(null)).toBe("—");
  });

  it("formats the working-day mask", () => {
    expect(formatWorkingDays(0b0011111)).toBe("Mon–Fri");
    expect(formatWorkingDays(toggleDayInMask(0b0011111, 5))).toBe("Mon–Sat");
    expect(formatWorkingDays(0)).toBe("No working days set");
  });

  it("formats plain dates without shifting across timezones", () => {
    expect(formatPlainDate("2026-09-14")).toBe("14 Sep 2026");
  });

  it("derives initials", () => {
    expect(initials("David Smart")).toBe("DS");
    expect(initials(null)).toBe("?");
  });
});
