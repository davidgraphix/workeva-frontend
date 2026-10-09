import fs from "node:fs";
import path from "node:path";
import { createClient, type Session } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Security of the Workeva API and of Supabase's own REST gateway, exercised with REAL
 * Supabase-issued tokens for real staging accounts - no mocks, no test signing keys.
 *
 * Two owners of two separate companies are enough for authentication, token validation,
 * cross-tenant isolation, IDOR and mass-assignment checks. The employee checks (RBAC,
 * suspension) also need an invited employee of Company A, which needs working invitation
 * email; they are skipped, not passed, without one.
 *
 * Nothing sensitive is printed: no token, password or key reaches the output.
 * See e2e/staging/README.md for the accounts and variables.
 */

const env = (name: string) => process.env[name] ?? localPublicEnv()[name] ?? "";

/** The public Supabase values the web app already uses, read from .env.local if not exported. */
function localPublicEnv(): Record<string, string> {
  try {
    const text = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(
      text.split(/\r?\n/)
        .filter((line) => line.startsWith("NEXT_PUBLIC_") && line.includes("="))
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const SUPABASE_URL = () => env("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = () => env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const API = () => env("E2E_API_BASE_URL") || env("NEXT_PUBLIC_API_BASE_URL");

const ownersConfigured = ["E2E_OWNER_A_EMAIL", "E2E_OWNER_A_PASSWORD", "E2E_OWNER_B_EMAIL", "E2E_OWNER_B_PASSWORD"]
  .every((name) => env(name));
const employeeConfigured = ["E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD"].every((name) => env(name));

test.skip(!ownersConfigured || !SUPABASE_URL() || !ANON_KEY() || !API(),
  "Set E2E_OWNER_A/B_EMAIL and _PASSWORD (and the public Supabase values) - see e2e/staging/README.md");

type Json = Record<string, unknown>;

function supabase() {
  return createClient(SUPABASE_URL(), ANON_KEY(), { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(emailVar: string, passwordVar: string): Promise<Session> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: env(emailVar), password: env(passwordVar) });
  // Deliberately vague: the error text never includes the address or password.
  expect(error, `sign-in failed for ${emailVar}`).toBeNull();
  return data.session!;
}

async function api(token: string, route: string, init: { method?: string; body?: unknown; organizationId?: string } = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.organizationId) headers["X-Organization-Id"] = init.organizationId;
  const response = await fetch(`${API()}${route}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  let json: Json | Json[] | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON, e.g. CSV */ }
  return { status: response.status, json, text };
}

const items = (json: unknown): Json[] =>
  Array.isArray(json) ? (json as Json[]) : (((json as Json | null)?.items as Json[] | undefined) ?? []);

/** Reads a Supabase REST table with a user's own JWT - what anyone holding their token could do. */
async function rest(token: string, table: string) {
  const response = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?select=*`, {
    headers: { apikey: ANON_KEY(), Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, rows: Array.isArray(body) ? (body as Json[]) : null };
}

function tamperSignature(token: string) {
  const [header = "", payload = "", signature = ""] = token.split(".");
  const flipped = signature.slice(0, -4) + (signature.endsWith("AAAA") ? "BBBB" : "AAAA");
  return [header, payload, flipped].join(".");
}

function swapSubject(token: string, sub: string) {
  const [header = "", payload = "", signature = ""] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  claims.sub = sub;
  return [header, Buffer.from(JSON.stringify(claims)).toString("base64url"), signature].join(".");
}

test.describe.serial("real-token API and database security", () => {
  let ownerA: Session;
  let ownerB: Session;
  let orgA = "";
  let orgB = "";

  test.beforeAll(async () => {
    ownerA = await signIn("E2E_OWNER_A_EMAIL", "E2E_OWNER_A_PASSWORD");
    ownerB = await signIn("E2E_OWNER_B_EMAIL", "E2E_OWNER_B_PASSWORD");

    const meA = await api(ownerA.access_token, "/api/me");
    const meB = await api(ownerB.access_token, "/api/me");
    orgA = ((meA.json as Json)?.active as Json | null)?.organizationId as string ?? "";
    orgB = ((meB.json as Json)?.active as Json | null)?.organizationId as string ?? "";
    expect(orgA, "Owner A must have finished onboarding").toBeTruthy();
    expect(orgB, "Owner B must have finished onboarding").toBeTruthy();
    expect(orgA).not.toBe(orgB);
  });

  test("Supabase issues an asymmetrically signed access token", async () => {
    const header = JSON.parse(Buffer.from(ownerA.access_token.split(".")[0] ?? "", "base64url").toString());
    expect(header.alg).toMatch(/^(ES|RS)256$/);
    expect(header.kid).toBeTruthy();
  });

  test("the API accepts the real token and identifies the caller from it", async () => {
    const me = await api(ownerA.access_token, "/api/me");
    expect(me.status).toBe(200);
    expect((me.json as Json).userId).toBe(ownerA.user.id);
  });

  test("a token with a tampered signature is rejected", async () => {
    expect((await api(tamperSignature(ownerA.access_token), "/api/me")).status).toBe(401);
  });

  test("a genuine token re-labelled as another user is rejected", async () => {
    expect((await api(swapSubject(ownerA.access_token, ownerB.user.id), "/api/me")).status).toBe(401);
  });

  test("the public anon key is not accepted as a user token", async () => {
    expect((await api(ANON_KEY(), "/api/me")).status).toBe(401);
  });

  test("naming another company's organization in the header is refused", async () => {
    for (const route of ["/api/employees", "/api/departments", "/api/tasks", "/api/audit", "/api/settings",
      "/api/reports/attendance", "/api/leave/requests", "/api/attendance", "/api/notifications", "/api/roles"]) {
      const response = await api(ownerA.access_token, route, { organizationId: orgB });
      expect([400, 403], `${route} with Company B's organization id`).toContain(response.status);
      expect(response.text, `${route} must not return Company B data`).not.toContain(`"organizationId":"${orgB}"`);
    }
  });

  test("Company A cannot read or change Company B's records by id (IDOR)", async () => {
    const tokenB = ownerB.access_token;
    const employeesB = items((await api(tokenB, "/api/employees")).json);
    const departmentsB = items((await api(tokenB, "/api/departments")).json);
    const locationsB = items((await api(tokenB, "/api/locations")).json);
    const tasksB = items((await api(tokenB, "/api/tasks")).json);
    const leaveB = items((await api(tokenB, "/api/leave/requests")).json);
    const notificationsB = items((await api(tokenB, "/api/notifications")).json);

    expect(employeesB.length, "Company B needs at least its owner's employee record").toBeGreaterThan(0);

    const reads: string[] = [
      ...employeesB.map((e) => `/api/employees/${e.id}`),
      ...employeesB.map((e) => `/api/employees/${e.id}/leave-balances`),
      ...departmentsB.map((d) => `/api/departments/${d.id}`),
      ...tasksB.map((t) => `/api/tasks/${t.id}`),
      ...leaveB.map((l) => `/api/leave/requests/${l.id}`),
    ];
    for (const route of reads) {
      const response = await api(ownerA.access_token, route);
      expect([403, 404], `A reading ${route.replace(/[0-9a-f-]{36}/, "<B id>")}`).toContain(response.status);
    }

    const writes: { route: string; method: string; body?: unknown }[] = [
      ...departmentsB.map((d) => ({ route: `/api/departments/${d.id}`, method: "PUT", body: { name: "Hijacked", description: null, managerEmployeeId: null } })),
      ...departmentsB.map((d) => ({ route: `/api/departments/${d.id}`, method: "DELETE" })),
      ...locationsB.map((l) => ({ route: `/api/locations/${l.id}`, method: "PUT", body: { name: "Hijacked", address: null, latitude: 0, longitude: 0, radiusMeters: 5000, isActive: true } })),
      ...locationsB.map((l) => ({ route: `/api/locations/${l.id}`, method: "DELETE" })),
      ...employeesB.map((e) => ({ route: `/api/employees/${e.id}/status`, method: "POST", body: { status: 1, reason: "cross-tenant attempt" } })),
      ...tasksB.map((t) => ({ route: `/api/tasks/${t.id}/status`, method: "POST", body: { status: 3 } })),
      ...leaveB.map((l) => ({ route: `/api/leave/requests/${l.id}/approve`, method: "POST", body: { note: null } })),
      ...notificationsB.map((n) => ({ route: `/api/notifications/${n.id}/read`, method: "POST" })),
      { route: "/api/tasks", method: "POST", body: { title: "Cross-tenant task", description: null, assigneeEmployeeId: employeesB[0]?.id, departmentId: null, priority: 1, dueDate: null } },
    ];
    for (const attempt of writes) {
      const response = await api(ownerA.access_token, attempt.route, { method: attempt.method, body: attempt.body });
      expect([400, 403, 404, 422], `A ${attempt.method} ${attempt.route.replace(/[0-9a-f-]{36}/, "<B id>")}`)
        .toContain(response.status);
    }

    // And nothing changed on B's side.
    const after = items((await api(tokenB, "/api/departments")).json);
    expect(after.map((d) => d.name)).toEqual(departmentsB.map((d) => d.name));
    const locationsAfter = items((await api(tokenB, "/api/locations")).json);
    expect(locationsAfter.map((l) => [l.name, l.radiusMeters])).toEqual(locationsB.map((l) => [l.name, l.radiusMeters]));
  });

  test("organization and ownership fields in a request body are ignored (mass assignment)", async () => {
    const name = `MassAssign ${Date.now()}`;
    const created = await api(ownerA.access_token, "/api/departments", {
      method: "POST",
      body: { name, description: null, managerEmployeeId: null, organizationId: orgB, id: crypto.randomUUID() },
    });
    expect(created.status).toBe(201);
    const id = (created.json as Json).id as string;

    try {
      expect(items((await api(ownerA.access_token, "/api/departments")).json).some((d) => d.id === id)).toBe(true);
      expect(items((await api(ownerB.access_token, "/api/departments")).json).some((d) => d.name === name)).toBe(false);
    } finally {
      await api(ownerA.access_token, `/api/departments/${id}`, { method: "DELETE" });
    }
  });

  test("through Supabase's own REST API, a signed-in owner sees only their own company", async () => {
    for (const table of ["organizations", "employees", "departments", "tasks", "notifications", "audit_logs", "company_settings"]) {
      const { status, rows } = await rest(ownerA.access_token, table);
      expect(status, table).toBe(200);
      for (const row of rows ?? []) {
        const organization = (row.organization_id ?? row.id) as string;
        expect(organization, `${table} row from another company`).toBe(orgA);
      }
    }
  });

  test("through Supabase's own REST API, a signed-in owner cannot write", async () => {
    const response = await fetch(`${SUPABASE_URL()}/rest/v1/departments`, {
      method: "POST",
      headers: { apikey: ANON_KEY(), Authorization: `Bearer ${ownerA.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Direct write", organization_id: orgA }),
    });
    expect([401, 403]).toContain(response.status);
  });

  test("signing out revokes the refresh token (the access token lives until it expires)", async () => {
    const client = supabase();
    const { data } = await client.auth.signInWithPassword({ email: env("E2E_OWNER_B_EMAIL"), password: env("E2E_OWNER_B_PASSWORD") });
    const session = data.session!;
    await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    await client.auth.signOut({ scope: "global" });

    const refreshed = await supabase().auth.refreshSession({ refresh_token: session.refresh_token });
    expect(refreshed.error, "refresh after sign-out").not.toBeNull();

    // Recorded, not asserted: a signed JWT stays verifiable until `exp`. The API does not
    // consult Supabase per request, so this documents the real window rather than hiding it.
    const reuse = await api(session.access_token, "/api/me");
    const secondsLeft = session.expires_at! - Math.floor(Date.now() / 1000);
    test.info().annotations.push({
      type: "session",
      description: `API status for the signed-out access token: ${reuse.status}; token expires in ${secondsLeft}s`,
    });
  });

  test.describe("with an invited employee of Company A", () => {
    test.skip(!employeeConfigured, "Needs E2E_EMPLOYEE_A_EMAIL/_PASSWORD - an employee invited into Company A");

    let employee: Session;
    let employeeId = "";

    test.beforeAll(async () => {
      employee = await signIn("E2E_EMPLOYEE_A_EMAIL", "E2E_EMPLOYEE_A_PASSWORD");
      const me = await api(employee.access_token, "/api/me");
      const active = (me.json as Json).active as Json;
      expect(active.organizationId).toBe(orgA);
      expect(active.roleKey).toBe("employee");
      employeeId = active.employeeId as string;
    });

    test("an employee cannot use management endpoints", async () => {
      const attempts: { route: string; method?: string; body?: unknown }[] = [
        { route: "/api/audit" },
        { route: "/api/reports/attendance" },
        { route: "/api/reports/attendance.csv" },
        { route: "/api/settings" },
        { route: "/api/settings", method: "PUT", body: {} },
        { route: "/api/invitations" },
        { route: "/api/invitations", method: "POST", body: { email: "someone@example.invalid", firstName: "X", lastName: "Y", roleKey: "owner" } },
        { route: "/api/departments", method: "POST", body: { name: "Rogue", description: null, managerEmployeeId: null } },
        { route: "/api/attendance/suspicious" },
        { route: "/api/dashboard/admin" },
      ];
      for (const attempt of attempts) {
        const response = await api(employee.access_token, attempt.route, { method: attempt.method, body: attempt.body });
        expect([400, 403, 404], `employee ${attempt.method ?? "GET"} ${attempt.route}`).toContain(response.status);
      }
    });

    test("an employee cannot promote themselves or read colleagues", async () => {
      const roles = items((await api(ownerA.access_token, "/api/roles")).json);
      const ownerRole = roles.find((r) => r.key === "owner");
      const members = items((await api(ownerA.access_token, "/api/members")).json);
      const self = members.find((m) => m.userId === employee.user.id);
      if (ownerRole && self) {
        const promote = await api(employee.access_token, `/api/members/${self.id}/role`, { method: "PUT", body: { roleId: ownerRole.id } });
        expect([403, 404]).toContain(promote.status);
      }

      const colleagues = items((await api(ownerA.access_token, "/api/employees")).json).filter((e) => e.id !== employeeId);
      for (const colleague of colleagues.slice(0, 5)) {
        expect([403, 404]).toContain((await api(employee.access_token, `/api/employees/${colleague.id}`)).status);
      }

      const { rows } = await rest(employee.access_token, "employees");
      expect((rows ?? []).map((r) => r.id)).toEqual([employeeId]);
    });

    test("a suspended employee is refused on their very next request, with the same token", async () => {
      expect((await api(employee.access_token, "/api/attendance/today")).status).toBe(200);

      const suspend = await api(ownerA.access_token, `/api/employees/${employeeId}/status`, {
        method: "POST", body: { status: 1, reason: "staging suspension test" },
      });
      expect(suspend.status).toBeLessThan(300);

      try {
        const blocked = await api(employee.access_token, "/api/attendance/today");
        expect(blocked.status).toBe(403);
        expect(blocked.text).toContain("employee_inactive");

        const me = await api(employee.access_token, "/api/me");
        expect((me.json as Json).accessIssue).toBe("employee_inactive");

        // Supabase REST with the same token: RLS excludes a suspended employee entirely.
        const { rows } = await rest(employee.access_token, "employees");
        expect(rows ?? []).toHaveLength(0);
      } finally {
        const restore = await api(ownerA.access_token, `/api/employees/${employeeId}/status`, {
          method: "POST", body: { status: 0, reason: "staging suspension test finished" },
        });
        expect(restore.status).toBeLessThan(300);
      }

      expect((await api(employee.access_token, "/api/attendance/today")).status).toBe(200);
    });
  });
});
