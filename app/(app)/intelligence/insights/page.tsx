"use client";

import { useState } from "react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  FigureGrid,
  IntelligenceNotEnabled,
  NothingDetected,
  SectionCard,
} from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Select } from "@/components/ui/field";
import { CardSkeleton, QueryBoundary } from "@/components/ui/states";
import {
  useInsights,
  useManagementAnalytics,
  useWorkAnalytics,
  useWorkforceAnalytics,
} from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { PeriodKind, periodLabels } from "@/lib/types";

/**
 * Analytics.
 *
 * Three sections, one per family, each loaded separately so a slow family does not hold up the
 * others — and each figure arrives with its period, its qualification and its note, so an
 * approximation is never shown as a measurement.
 *
 * None of this calls an AI provider. These are computed figures, and they work identically whether
 * or not the assistant is configured or available, which is the reason the intelligence feature
 * flags are granular: a company can take the analytics without taking an AI bill.
 */
export default function InsightsPage() {
  const { can } = useSession();
  const [period, setPeriod] = useState<PeriodKind>(PeriodKind.ThisMonth);

  const workforce = useWorkforceAnalytics({ period });
  const work = useWorkAnalytics({ period });
  const management = useManagementAnalytics({ period });
  const insights = useInsights(20);

  if (!can(Permission.intelligenceView)) return <NoAccess />;

  if (workforce.error instanceof ApiError && workforce.error.status === 404) {
    return (
      <>
        <PageHeader title="Analytics" description="Computed figures about your organization." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Computed from your own records. No figure here is an AI's recollection of anything."
        actions={
          <Select
            label="Period"
            containerClassName="w-40"
            value={String(period)}
            onChange={(event) => setPeriod(Number(event.target.value) as PeriodKind)}
          >
            {[
              PeriodKind.Today,
              PeriodKind.ThisWeek,
              PeriodKind.ThisMonth,
              PeriodKind.LastMonth,
              PeriodKind.ThisQuarter,
              PeriodKind.Last30Days,
              PeriodKind.Last90Days,
            ].map((kind) => (
              <option key={kind} value={kind}>
                {periodLabels[kind]}
              </option>
            ))}
          </Select>
        }
      />

      <div className="space-y-5">
        <QueryBoundary
          isLoading={management.isLoading}
          error={management.error}
          data={management.data}
          onRetry={() => management.refetch()}
          loadingFallback={<CardSkeleton />}
          isEmpty={(data) => data.figures.length === 0}
          emptyState={<></>}
        >
          {(data) => (
            <SectionCard
              title="Organization"
              description={`${data.periodLabel} · ${data.periodStart} to ${data.periodEnd}`}
            >
              <FigureGrid figures={data.figures} />
            </SectionCard>
          )}
        </QueryBoundary>

        <QueryBoundary
          isLoading={workforce.isLoading}
          error={workforce.error}
          data={workforce.data}
          onRetry={() => workforce.refetch()}
          loadingFallback={<CardSkeleton />}
          isEmpty={(data) => data.figures.length === 0}
          emptyState={<></>}
        >
          {(data) => (
            <SectionCard
              title="Workforce, attendance and leave"
              description={`${data.periodLabel} · ${data.periodStart} to ${data.periodEnd}`}
            >
              <FigureGrid figures={data.figures} />
            </SectionCard>
          )}
        </QueryBoundary>

        <QueryBoundary
          isLoading={work.isLoading}
          error={work.error}
          data={work.data}
          onRetry={() => work.refetch()}
          loadingFallback={<CardSkeleton />}
          isEmpty={(data) => data.figures.length === 0}
          emptyState={<></>}
        >
          {(data) => (
            <SectionCard
              title="Projects, tasks and workload"
              description={`${data.periodLabel} · ${data.periodStart} to ${data.periodEnd}`}
            >
              <FigureGrid figures={data.figures} />
            </SectionCard>
          )}
        </QueryBoundary>

        {insights.data && insights.data.length > 0 && (
          <SectionCard title="Observations" description="What the background sweep noticed.">
            <ul className="space-y-3">
              {insights.data.map((insight) => (
                <li key={insight.id}>
                  <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {insight.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {insight.periodStart} to {insight.periodEnd}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {!workforce.isLoading &&
          !work.isLoading &&
          !management.isLoading &&
          (workforce.data?.figures.length ?? 0) === 0 &&
          (work.data?.figures.length ?? 0) === 0 &&
          (management.data?.figures.length ?? 0) === 0 && (
            <NothingDetected
              title="Nothing to measure yet"
              description="Once there are employees, attendance records, projects or tasks, their figures appear here."
            />
          )}
      </div>
    </>
  );
}
