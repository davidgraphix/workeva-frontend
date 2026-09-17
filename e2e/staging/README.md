# Staging E2E

These tests drive the real application - Next.js, the Workeva API, Supabase Auth and
Postgres - through a browser. They need a deployed (or locally running) staging stack
and **pre-created, email-verified test accounts**. They are skipped when the variables
below are absent, and are never counted as passing in that case.

## One-time staging setup

1. In the staging Supabase project, create two organizations through the app:
   - **E2E Company A** - owner account, a location covering the coordinates below,
     an Engineering department managed by the manager account.
   - **E2E Company B** - owner account with at least one employee.
2. Invite and accept: a manager and an employee in Company A (both in Engineering).
3. Set Company A's location to latitude `6.4281`, longitude `3.4219`, radius `200` m.

Use fictional people and a mailbox you control. Never use production.

## Variables

| Variable | Meaning |
|---|---|
| `E2E_BASE_URL` | Staging web app URL, e.g. `https://workeva-staging.vercel.app` |
| `E2E_OWNER_A_EMAIL` / `E2E_OWNER_A_PASSWORD` | Company A owner |
| `E2E_MANAGER_A_EMAIL` / `E2E_MANAGER_A_PASSWORD` | Company A Engineering manager |
| `E2E_EMPLOYEE_A_EMAIL` / `E2E_EMPLOYEE_A_PASSWORD` | Company A Engineering employee |
| `E2E_EMPLOYEE_B_ID` | An employee id that belongs to Company B |

Put them in a git-ignored `.env.e2e` and export them in your shell, or set them as CI
environment secrets for a staging job. Never commit them.

## Run

```bash
npm run e2e:staging
```

The employee clock-in test grants the browser geolocation at Company A's office
coordinates. Because attendance is one record per day, run the attendance test at most
once per working day per employee account, or clock the account out and use a fresh
account next time.
