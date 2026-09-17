# Workeva Web

The web app for **Workeva**. Next.js 16 (App Router) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 · TanStack Query · React Hook Form + Zod · Supabase Auth · Recharts.

All business logic, authorization and tenant isolation live in the API
(`workeva-backend`). This app renders, validates for the user's benefit, and calls it.
Hiding a button here is a design decision, not a security control.

## Quick start

```bash
cp .env.example .env.local   # API URL + Supabase URL + anon key (all public-safe)
npm install
npm run dev                  # http://localhost:3000
```

The API must be running and must list `http://localhost:3000` in
`Security__AllowedOrigins`.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (needs the three `NEXT_PUBLIC_*` variables) |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |

## Structure

```
app/
  (auth)/        login, signup, forgot/reset password
  auth/callback  server-side code exchange after email confirmation
  invite/        invitation preview and acceptance
  onboarding/    company setup wizard
  (app)/         the signed-in application: dashboard, my-*, employees,
                 departments, attendance, leave, tasks, reports, audit,
                 notifications, profile, settings
components/
  ui/            design system: button, fields, dialog, toast, table, states, badges
  app/           shell, navigation, page header
  features/      clock card, leave/task dialogs and lists, employee forms
hooks/           one data hook per API resource (TanStack Query)
lib/             API client, types mirroring the API DTOs, formatting, permissions
middleware.ts    session refresh + signed-out redirects
```

## Behaviour worth knowing

- **Navigation is permission-driven.** Each menu item declares the permissions it
  needs; owners, managers and employees see the right subset automatically.
- **Dashboard follows scope**: company-wide roles get the company view, managers the
  team view, everyone else the "today" view with the clock-in card first.
- **Clock-in never shows success optimistically.** Location is requested only when the
  button is tapped, and only if the company requires it; the API decides.
- **Tables become cards below `md`**, and a bottom bar keeps attendance one tap away on phones.
- **Accessibility**: semantic landmarks, skip link, visible focus rings, labelled
  fields with `aria-describedby` errors, native `<dialog>` modals, status text as well
  as colour, reduced-motion respected.

See the backend's `docs/` for architecture, security and deployment.
