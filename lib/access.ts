import type { MeResponse } from "./types";

/**
 * What the signed-in shell should render for a given session. Kept pure so the
 * decision is unit tested; the API still refuses anything this lets through.
 */
export type SessionGate =
  | { kind: "loading" }
  | { kind: "onboarding" }
  | { kind: "access-issue"; title: string; message: string }
  | { kind: "app" };

export function describeAccessIssue(code: string | null | undefined): { title: string; message: string } {
  switch (code) {
    case "employee_inactive":
      return {
        title: "Your access has been paused",
        message:
          "Your employee account in this organization is suspended or no longer active. Contact your administrator if you think this is a mistake.",
      };
    case "organization_forbidden":
      return {
        title: "You don't have access to that organization",
        message: "Choose one of your organizations, or sign in with a different account.",
      };
    case "organization_ambiguous":
      return {
        title: "Choose an organization",
        message: "You belong to more than one organization. Pick the one you want to work in.",
      };
    default:
      return {
        title: "We couldn't open your workspace",
        message: "Your account isn't linked to an active organization right now.",
      };
  }
}

export function sessionGate(me: MeResponse | null, isLoading: boolean): SessionGate {
  if (isLoading || !me) return { kind: "loading" };
  if (me.needsOrganization) return { kind: "onboarding" };
  if (!me.active) return { kind: "access-issue", ...describeAccessIssue(me.accessIssue) };
  return { kind: "app" };
}
