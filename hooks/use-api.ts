"use client";

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { api, apiBlob, ApiError, type ApiRequestOptions } from "@/lib/api";
import { useAuthContext } from "@/components/session-provider";
import { downloadBlob } from "@/lib/utils";

/**
 * The bridge between TanStack Query and the API client.
 *
 * Query keys always include the organization id, so switching companies can
 * never show cached data from the previous one.
 */

export function useApiRequest() {
  const { token, organizationId } = useAuthContext();

  return useCallback(
    <T>(path: string, options: Omit<ApiRequestOptions, "token" | "organizationId"> = {}) =>
      api<T>(path, { ...options, token, organizationId }),
    [token, organizationId],
  );
}

/** A query that is scoped to the current organization and waits for a session. */
export function useApiQuery<T>(
  key: readonly unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  const { token, organizationId } = useAuthContext();
  const request = useApiRequest();

  return useQuery<T, ApiError>({
    queryKey: [organizationId, ...key],
    enabled: Boolean(token) && (options?.enabled ?? true),
    // Retrying a 403 or a 404 only wastes time; retry the things that might heal.
    retry: (failureCount, error) => error.isRetryable && failureCount < 2,
    staleTime: 30_000,
    ...options,
    queryFn: ({ signal }) => request<T>(path, { signal }),
  });
}

/**
 * A mutation that invalidates the query keys it affects on success.
 *
 * `mutationFn` receives the request helper, so call sites read as the HTTP call
 * they make.
 */
export function useApiMutation<TResult, TVariables = void>(
  mutationFn: (
    request: <T>(path: string, options?: Omit<ApiRequestOptions, "token" | "organizationId">) => Promise<T>,
    variables: TVariables,
  ) => Promise<TResult>,
  options?: Omit<UseMutationOptions<TResult, ApiError, TVariables>, "mutationFn"> & {
    /** Prefixes of query keys to invalidate once the mutation succeeds. */
    invalidates?: readonly (readonly unknown[])[];
  },
) {
  const request = useApiRequest();
  const queryClient = useQueryClient();
  const { organizationId } = useAuthContext();
  const { invalidates, onSuccess, ...rest } = options ?? {};

  return useMutation<TResult, ApiError, TVariables>({
    ...rest,
    // A mutation is not safe to replay blindly - a retried clock-in could create
    // a second record - so retries are the caller's decision, not the default.
    retry: false,
    mutationFn: (variables) => mutationFn(request, variables),
    onSuccess: async (...args) => {
      if (invalidates) {
        await Promise.all(
          invalidates.map((key) =>
            queryClient.invalidateQueries({ queryKey: [organizationId, ...key] }),
          ),
        );
      }
      await onSuccess?.(...args);
    },
  });
}

/** Downloads a CSV export through the authenticated API client. */
export function useCsvDownload() {
  const { token, organizationId } = useAuthContext();

  return useCallback(
    async (path: string) => {
      const { blob, fileName } = await apiBlob(path, { token, organizationId });
      downloadBlob(blob, fileName);
    },
    [token, organizationId],
  );
}

/** Query key factories, so invalidation and fetching cannot drift apart. */
export const queryKeys = {
  me: ["me"] as const,
  dashboard: (kind: string) => ["dashboard", kind] as const,
  employees: (filters?: unknown) => withFilters("employees", filters),
  employee: (id: string) => ["employee", id] as const,
  departments: ["departments"] as const,
  roles: ["roles"] as const,
  members: ["members"] as const,
  invitations: ["invitations"] as const,
  locations: ["locations"] as const,
  settings: ["settings"] as const,
  organization: ["organization"] as const,
  attendanceToday: ["attendance", "today"] as const,
  attendance: (filters?: unknown) => withFilters("attendance", filters),
  attendanceSummary: ["attendance", "summary"] as const,
  attendanceActivity: ["attendance", "activity"] as const,
  suspicious: (page: number) => ["attendance", "suspicious", page] as const,
  leaveTypes: ["leave", "types"] as const,
  leaveBalances: ["leave", "balances"] as const,
  leaveRequests: (filters?: unknown) => withFilters("leave", "requests", filters),
  leaveCalendar: (from: string, to: string) => ["leave", "calendar", from, to] as const,
  tasks: (filters?: unknown) => withFilters("tasks", filters),
  taskSummary: (onlyMine: boolean) => ["tasks", "summary", onlyMine] as const,
  task: (id: string) => ["task", id] as const,
  notifications: (filters?: unknown) => withFilters("notifications", filters),
  unreadCount: ["notifications", "unread"] as const,
  notificationPreferences: ["notifications", "preferences"] as const,
  audit: (filters?: unknown) => withFilters("audit", filters),
  reports: (kind: string, filters?: unknown) => withFilters("reports", kind, filters),
};

/**
 * Omitting filters yields a bare prefix, so `invalidates: [queryKeys.tasks()]`
 * refreshes every filtered task list. (TanStack Query matches keys element by
 * element; a trailing `null` would match nothing.)
 */
export function withFilters(...parts: unknown[]): unknown[] {
  const filters = parts[parts.length - 1];
  return filters === undefined ? parts.slice(0, -1) : parts;
}
