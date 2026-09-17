/**
 * The single place this app talks to the Workeva API.
 *
 * Nothing calls `fetch` directly. Everything goes through here so that
 * authentication, the organization header, error shape and timeouts are handled
 * once and identically.
 */

export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errorCode?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

/**
 * An error the API described. `message` is always safe to show a person: the API
 * writes its details for humans and never leaks internals.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail || problem.title || "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.errorCode = problem.errorCode;
    this.fieldErrors = problem.errors;
  }

  /** True when re-sending the same request could reasonably succeed. */
  get isRetryable() {
    return this.status >= 500 || this.status === 429 || this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  /** The caller is signed in but has no organization to act in yet. */
  get needsOrganization() {
    return this.errorCode === "organization_required";
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Supabase access token. Omit only for endpoints that genuinely allow anonymous access. */
  token?: string | null;
  /**
   * Which organization to act in. Sent as a hint only: the API verifies it
   * against the caller's memberships and refuses anything they don't belong to.
   */
  organizationId?: string | null;
  signal?: AbortSignal;
  /** Milliseconds before giving up. Kept generous for slow mobile networks. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local and point it at the Workeva API.",
    );
  }
  return url.replace(/\/$/, "");
}

async function request(path: string, options: ApiRequestOptions): Promise<Response> {
  const { method = "GET", body, token, organizationId, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (organizationId) headers["X-Organization-Id"] = organizationId;

  // Our own timeout, combined with any caller-supplied cancellation. Without
  // this a request on a stalled mobile connection hangs indefinitely and the
  // user is left staring at a spinner.
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combined,
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted) throw error;

    // A network failure, DNS problem, CORS rejection or our timeout firing. The
    // user needs to know it did not happen, and that retrying is reasonable.
    throw new ApiError(0, {
      title: "Connection problem",
      detail:
        error instanceof DOMException && error.name === "TimeoutError"
          ? "That took too long. Check your connection and try again."
          : "We couldn't reach Workeva. Check your connection and try again.",
    });
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {};

  try {
    const text = await response.text();
    if (text) problem = JSON.parse(text) as ProblemDetails;
  } catch {
    // A non-JSON error body (a proxy error page, say). Fall back to a generic message.
  }

  if (!problem.detail && !problem.title) {
    problem.detail =
      response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
          ? "You don't have permission to perform this action."
          : response.status === 404
            ? "We couldn't find what you were looking for."
            : response.status === 429
              ? "Too many attempts. Please wait a moment and try again."
              : "We couldn't complete that action. Please try again.";
  }

  return new ApiError(response.status, problem);
}

/** Performs a request and parses the JSON body. Throws {@link ApiError} on failure. */
export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await request(path, options);

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Performs a request and returns the raw body, for file downloads. */
export async function apiBlob(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ blob: Blob; fileName: string }> {
  const response = await request(path, options);
  if (!response.ok) throw await toApiError(response);

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);

  return {
    blob: await response.blob(),
    fileName: match?.[1] ? decodeURIComponent(match[1]) : "workeva-export.csv",
  };
}

/** Builds a query string, omitting empty values so the API sees a clean request. */
export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const result = search.toString();
  return result ? `?${result}` : "";
}
