# Staging E2E

These tests drive the real application - Next.js, the Workeva API, Supabase Auth and
Postgres - with real Supabase-issued tokens. They need a running staging stack (deployed,
or local against the staging Supabase project) and **email-verified test accounts**. They
are skipped when the variables below are absent, and are never counted as passing then.

| Spec | Needs | Covers |
|---|---|---|
| `api-security.spec.ts` | two owners (A, B); optionally an employee of A | real JWT acceptance and rejection, forged organization header, IDOR reads and writes, mass assignment, Supabase REST (RLS) with real user tokens, sign-out; with the employee: RBAC, self-promotion, suspension with a live token |
| `golden-flow.spec.ts` | owner, manager and employee of A | the pilot flow in a browser: clock-in inside and outside the geofence, tasks, leave, notifications, reports, audit, clock-out |

The employee and manager accounts can only be created by **accepting an invitation**, and
the invitation link is only ever delivered by email - it is never shown in the app or
written to a log. Until `Email__BrevoApiKey` is set on the API, those parts stay skipped.

## One-time setup

1. **Supabase → Authentication → URL Configuration:** Site URL `http://localhost:3000`
   (or the deployed staging URL); add redirect URLs `http://localhost:3000/auth/callback`
   and `http://localhost:3000/reset-password`.
2. Start the stack: the API (`workeva-backend`, with `.env.local` loaded) on port 5080, and
   the web app with `npm run dev` on port 3000.
3. In a browser, **sign up two owners** with mailboxes you control, confirm each email, and
   complete onboarding - **E2E Company A** and **E2E Company B**. Give Company A an office
   at latitude `6.4281`, longitude `3.4219`, radius `200` m.
4. Only with Brevo configured: from Company A, invite a manager and an employee into an
   Engineering department and accept both invitations.

Supabase's built-in email sender is limited to a few messages an hour; space sign-ups out or
configure custom SMTP. Use fictional people. Never point this at production.

## Variables

Put them in a git-ignored `.env.e2e` and export them in your shell. Never commit them, and
never paste them into chat or an issue.

| Variable | Meaning |
|---|---|
| `E2E_BASE_URL` | Web app URL, e.g. `http://localhost:3000` |
| `E2E_API_BASE_URL` | Optional; defaults to `NEXT_PUBLIC_API_BASE_URL` from `.env.local` |
| `E2E_OWNER_A_EMAIL` / `E2E_OWNER_A_PASSWORD` | Company A owner |
| `E2E_OWNER_B_EMAIL` / `E2E_OWNER_B_PASSWORD` | Company B owner |
| `E2E_MANAGER_A_EMAIL` / `E2E_MANAGER_A_PASSWORD` | Company A Engineering manager (needs Brevo) |
| `E2E_EMPLOYEE_A_EMAIL` / `E2E_EMPLOYEE_A_PASSWORD` | Company A Engineering employee (needs Brevo) |
| `E2E_EMPLOYEE_B_ID` | An employee id that belongs to Company B |

The public Supabase URL and anon key are read from `.env.local`, as the web app does.

## Run

```bash
npm run e2e:staging
```

The output never contains a token, password or key. The sign-out test records - rather
than asserts - how long a signed-out access token remains usable, because a signed JWT stays
verifiable until it expires; see the session section of `docs/security.md` in the API.

The employee clock-in test grants the browser geolocation at Company A's office
coordinates. Attendance is one record per day, so run it at most once per working day per
employee account.
