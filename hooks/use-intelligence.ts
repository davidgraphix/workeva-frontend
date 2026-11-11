"use client";

import { query } from "@/lib/api";
import { queryKeys, useApiMutation, useApiQuery } from "./use-api";
import type {
  AlertCategory,
  AlertResponse,
  AlertRuleSettingResponse,
  AlertStatus,
  AnalyticsResponse,
  AskResponse,
  AssistantStatusResponse,
  ConversationDetailResponse,
  ConversationResponse,
  IntelligenceDashboardResponse,
  IntelligenceSeverity,
  InsightResponse,
  MetricCatalogueEntry,
  PagedResult,
  PeriodKind,
  RiskBand,
  RiskResponse,
} from "@/lib/types";

/**
 * Workeva Intelligence.
 *
 * The same conventions as the rest of the app: query keys carry the organization so switching
 * companies cannot show cached data from the previous one, mutations declare what they
 * invalidate, and nothing here decides authorization. The API does that; these calls surface
 * what it returns, including its refusals.
 *
 * Every endpoint behind these hooks answers 404 when the organization does not have the
 * matching intelligence feature, so a 404 is the normal "not enabled here" answer rather than a
 * bug - which is why the pages treat it as a state to render rather than an error to retry.
 *
 * Two things these hooks deliberately do not do. They do not compute figures: every number comes
 * from the server, with the period and the qualification attached, because a dashboard that did
 * its own arithmetic would be a second source of truth that drifts. And they do not cache the
 * assistant's answers, because an answer is a record of a conversation rather than a view of
 * current state - re-fetching it would be meaningless and caching it would be misleading.
 */

// ---------- The dashboard ----------

export interface IntelligencePeriod {
  period?: PeriodKind;
  from?: string;
  to?: string;
}

export const useIntelligenceDashboard = (filters: IntelligencePeriod = {}) =>
  useApiQuery<IntelligenceDashboardResponse>(
    queryKeys.intelligenceDashboard(filters),
    `/api/v2/intelligence/dashboard${query(filters as Record<string, string | number | undefined>)}`,
    {
      // Kept fresh for a minute: the figures come from a background sweep that runs every few
      // hours, so re-querying on every focus would cost queries and change nothing.
      staleTime: 60_000,
    },
  );

// ---------- Analytics ----------

export interface AnalyticsFilters extends IntelligencePeriod {
  keys?: string[];
}

const analytics = (family: "workforce" | "work" | "management") =>
  (filters: AnalyticsFilters = {}) =>
    useApiQuery<AnalyticsResponse>(
      queryKeys.intelligenceAnalytics(family, filters),
      `/api/v2/intelligence/analytics/${family}${query(
        filters as Record<string, string | number | undefined>,
      )}`,
      { staleTime: 60_000 },
    );

export const useWorkforceAnalytics = analytics("workforce");
export const useWorkAnalytics = analytics("work");
export const useManagementAnalytics = analytics("management");

export const useMetricCatalogue = () =>
  useApiQuery<MetricCatalogueEntry[]>(
    queryKeys.intelligenceCatalogue(),
    "/api/v2/intelligence/analytics/catalogue",
    // The catalogue changes only when permissions do, which means a new session.
    { staleTime: 10 * 60_000 },
  );

// ---------- Alerts ----------

export interface AlertFilters {
  status?: AlertStatus;
  category?: AlertCategory;
  minimumSeverity?: IntelligenceSeverity;
  page?: number;
  pageSize?: number;
}

export const useAlerts = (filters: AlertFilters = {}) =>
  useApiQuery<PagedResult<AlertResponse>>(
    queryKeys.intelligenceAlerts(filters),
    `/api/v2/intelligence/alerts${query(filters as Record<string, string | number | undefined>)}`,
    { placeholderData: (previous) => previous },
  );

/**
 * Acknowledging says "I have seen this and I own it". Separate from resolving, because a system
 * that only offers "fixed" gets alerts marked fixed when they are merely read.
 */
export const useAcknowledgeAlert = () =>
  useApiMutation<AlertResponse, { id: string; note?: string }>(
    (request, { id, note }) =>
      request<AlertResponse>(`/api/v2/intelligence/alerts/${id}/acknowledge`, {
        method: "POST",
        body: { note: note ?? null },
      }),
    { invalidates: [["intelligence-alerts"], ["intelligence-dashboard"]] },
  );

export const useResolveAlert = () =>
  useApiMutation<AlertResponse, { id: string; note?: string }>(
    (request, { id, note }) =>
      request<AlertResponse>(`/api/v2/intelligence/alerts/${id}/resolve`, {
        method: "POST",
        body: { note: note ?? null },
      }),
    { invalidates: [["intelligence-alerts"], ["intelligence-dashboard"]] },
  );

// ---------- Insights and risk ----------

export const useInsights = (limit = 20) =>
  useApiQuery<InsightResponse[]>(
    queryKeys.intelligenceInsights(),
    `/api/v2/intelligence/insights?limit=${limit}`,
    { staleTime: 60_000 },
  );

export interface RiskFilters {
  category?: string;
  minimumBand?: RiskBand;
  includeInsufficientData?: boolean;
  page?: number;
  pageSize?: number;
}

export const useRisks = (filters: RiskFilters = {}) =>
  useApiQuery<PagedResult<RiskResponse>>(
    queryKeys.intelligenceRisks(filters),
    `/api/v2/intelligence/risks${query(filters as Record<string, string | number | boolean | undefined>)}`,
    { placeholderData: (previous) => previous, staleTime: 60_000 },
  );

// ---------- Ask Workeva ----------

export const useAssistantStatus = () =>
  useApiQuery<AssistantStatusResponse>(
    queryKeys.assistantStatus(),
    "/api/v2/intelligence/ask/status",
  );

export interface ConversationFilters {
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

export const useConversations = (filters: ConversationFilters = {}) =>
  useApiQuery<PagedResult<ConversationResponse>>(
    queryKeys.conversations(filters),
    `/api/v2/intelligence/ask/conversations${query(
      filters as Record<string, string | number | boolean | undefined>,
    )}`,
  );

export const useConversation = (id: string | null) =>
  useApiQuery<ConversationDetailResponse>(
    queryKeys.conversation(id ?? "none"),
    `/api/v2/intelligence/ask/conversations/${id}`,
    { enabled: Boolean(id) },
  );

/**
 * Asks a question.
 *
 * Invalidates the conversation list and, when continuing one, that conversation - so the
 * transcript on screen is the server's record rather than a client-side guess at it. The
 * assistant status is invalidated too, because every question spends part of the day's allowance
 * and a user who is nearly out of it should be told before they type the next one.
 */
export const useAsk = () =>
  useApiMutation<AskResponse, { conversationId?: string | null; question: string }>(
    (request, { conversationId, question }) =>
      request<AskResponse>("/api/v2/intelligence/ask", {
        method: "POST",
        body: { conversationId: conversationId ?? null, question },
      }),
    { invalidates: [["conversations"], ["conversation"], ["assistant-status"]] },
  );

export const useArchiveConversation = () =>
  useApiMutation<ConversationResponse, { id: string; archived: boolean }>(
    (request, { id, archived }) =>
      request<ConversationResponse>(
        `/api/v2/intelligence/ask/conversations/${id}/archive?archived=${archived}`,
        { method: "PUT" },
      ),
    { invalidates: [["conversations"]] },
  );

export const useDeleteConversation = () =>
  useApiMutation<void, { id: string }>(
    (request, { id }) =>
      request<void>(`/api/v2/intelligence/ask/conversations/${id}`, { method: "DELETE" }),
    { invalidates: [["conversations"]] },
  );

// ---------- Settings ----------

export const useAlertRules = () =>
  useApiQuery<AlertRuleSettingResponse[]>(
    queryKeys.intelligenceRules(),
    "/api/v2/intelligence/settings/alert-rules",
  );

export const useSaveAlertRule = () =>
  useApiMutation<
    AlertRuleSettingResponse,
    {
      ruleKey: string;
      isEnabled: boolean;
      threshold: number | null;
      windowDays: number | null;
      minimumSeverity: IntelligenceSeverity;
    }
  >(
    (request, body) =>
      request<AlertRuleSettingResponse>("/api/v2/intelligence/settings/alert-rules", {
        method: "PUT",
        body,
      }),
    { invalidates: [["intelligence-rules"]] },
  );
