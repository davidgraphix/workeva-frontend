/** Routes reachable without a session. Everything else redirects to sign-in. */
export const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/invite"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * A post-sign-in destination taken from a query string. Only same-origin paths are
 * honoured, so a crafted link cannot bounce someone to another site (open redirect).
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
