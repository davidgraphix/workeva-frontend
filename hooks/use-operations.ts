"use client";

import { query } from "@/lib/api";
import { queryKeys, useApiMutation, useApiQuery } from "./use-api";
import type {
  MyOperationAssignmentResponse,
  OperationActivityResponse,
  OperationLocationResponse,
  OperationReportResponse,
  OperationStaffAssignmentResponse,
  OperationsDashboardResponse,
  PagedResult,
} from "@/lib/types";

/**
 * Operations: field locations, the work that can be reported there, who may report it, and
 * the shift reports themselves. Same conventions as the rest of the app - keys carry the
 * organization, mutations declare what they invalidate, and nothing here decides
 * authorization: the API does that and these calls simply surface what it returns.
 */

// ---------- Locations ----------

export interface OperationLocationFilters {
  search?: string;
  type?: number;
  onlyActive?: boolean;
  page?: number;
  pageSize?: number;
}

export const useOperationLocations = (filters: OperationLocationFilters = {}) =>
  useApiQuery<PagedResult<OperationLocationResponse>>(
    queryKeys.operationLocations(filters),
    `/api/operations/locations${query(filters as Record<string, string | number | boolean | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useOperationLocation = (id: string) =>
  useApiQuery<OperationLocationResponse>(queryKeys.operationLocation(id), `/api/operations/locations/${id}`, {
    enabled: Boolean(id),
  });

export interface SaveLocationBody {
  name: string;
  type: number;
  code: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  size: number | null;
  sizeUnit: string | null;
  notes: string | null;
  isActive: boolean;
}

export const useSaveOperationLocation = () =>
  useApiMutation<OperationLocationResponse, { id?: string; body: SaveLocationBody }>(
    (request, { id, body }) =>
      request<OperationLocationResponse>(id ? `/api/operations/locations/${id}` : "/api/operations/locations", {
        method: id ? "PUT" : "POST",
        body,
      }),
    { invalidates: [["operations"]] },
  );

// ---------- Activities ----------

export const useOperationActivities = (locationId?: string, onlyActive = false) =>
  useApiQuery<OperationActivityResponse[]>(
    queryKeys.operationActivities(`${locationId ?? "all"}-${onlyActive}`),
    `/api/operations/activities${query({ locationId, onlyActive })}`,
  );

export interface SaveActivityBody {
  name: string;
  description: string | null;
  unit: string;
  operationLocationId: string | null;
  isActive: boolean;
}

export const useSaveOperationActivity = () =>
  useApiMutation<OperationActivityResponse, { id?: string; body: SaveActivityBody }>(
    (request, { id, body }) =>
      request<OperationActivityResponse>(id ? `/api/operations/activities/${id}` : "/api/operations/activities", {
        method: id ? "PUT" : "POST",
        body,
      }),
    { invalidates: [["operations"]] },
  );

// ---------- Staff assignments ----------

export const useOperationStaff = (filters: { locationId?: string; employeeId?: string; onlyActive?: boolean } = {}) =>
  useApiQuery<OperationStaffAssignmentResponse[]>(
    queryKeys.operationStaff(filters),
    `/api/operations/staff${query(filters as Record<string, string | boolean | undefined>)}`,
  );

export const useAssignOperationStaff = () =>
  useApiMutation<OperationStaffAssignmentResponse, { operationLocationId: string; employeeId: string; role: number }>(
    (request, body) => request<OperationStaffAssignmentResponse>("/api/operations/staff", { method: "POST", body }),
    { invalidates: [["operations"]] },
  );

export const useUnassignOperationStaff = () =>
  useApiMutation<void, string>(
    (request, id) => request<void>(`/api/operations/staff/${id}`, { method: "DELETE" }),
    { invalidates: [["operations"]] },
  );

// ---------- Reports ----------

export interface OperationReportFilters {
  from?: string;
  to?: string;
  operationLocationId?: string;
  employeeId?: string;
  activityId?: string;
  shift?: number;
  status?: number;
  onlyMine?: boolean;
  page?: number;
  pageSize?: number;
}

export const useOperationReports = (filters: OperationReportFilters = {}) =>
  useApiQuery<PagedResult<OperationReportResponse>>(
    queryKeys.operationReports(filters),
    `/api/operations/reports${query(filters as Record<string, string | number | boolean | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useMyOperationReports = (filters: OperationReportFilters = {}) =>
  useApiQuery<PagedResult<OperationReportResponse>>(
    queryKeys.operationReports({ ...filters, mine: true }),
    `/api/operations/reports/mine${query(filters as Record<string, string | number | boolean | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

export const useOperationReport = (id: string) =>
  useApiQuery<OperationReportResponse>(queryKeys.operationReport(id), `/api/operations/reports/${id}`, {
    enabled: Boolean(id),
  });

export interface SubmitReportBody {
  operationLocationId: string;
  reportDate: string;
  shift: number;
  lines: { activityId: string; quantity: number; notes: string | null }[];
  notes: string | null;
  employeeId?: string | null;
}

export const useSubmitOperationReport = () =>
  useApiMutation<OperationReportResponse, SubmitReportBody>(
    (request, body) => request<OperationReportResponse>("/api/operations/reports", { method: "POST", body }),
    { invalidates: [["operations"]] },
  );

export const useReviewOperationReport = () =>
  useApiMutation<OperationReportResponse, { id: string; approve: boolean; note: string | null }>(
    (request, { id, approve, note }) =>
      request<OperationReportResponse>(`/api/operations/reports/${id}/review`, {
        method: "POST",
        body: { approve, note },
      }),
    { invalidates: [["operations"]] },
  );

// ---------- Dashboard and personal view ----------

export const useOperationsDashboard = (date?: string) =>
  useApiQuery<OperationsDashboardResponse>(
    queryKeys.operationsDashboard(date),
    `/api/operations/dashboard${query({ date })}`,
  );

export const useMyOperationAssignments = () =>
  useApiQuery<MyOperationAssignmentResponse[]>(queryKeys.myOperationAssignments, "/api/operations/my-assignments");
