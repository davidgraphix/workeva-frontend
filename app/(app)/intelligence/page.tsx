"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Sparkles, TrendingUp } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  AlertCard,
  FigureGrid,
  IntelligenceNotEnabled,
  NothingDetected,
  RiskCard,
  SectionCard,
  SweepStatus,
  WithheldNotice,
} from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Select } from "@/components/ui/field";
import { CardSkeleton, QueryBoundary } from "@/components/ui/states";
import { useIntelligenceDashboard } from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { PeriodKind, periodLabels } from "@/lib/types";

/**
 * The intelligence dashboard.
 *
 * One request, not nine. A dashboard that fires a request per panel shows nine independently
 * loading panels and a page that is never quite ready; the server assembles this and narrows
 * every section to what the caller may see, so two people in the same company get different
 * dashboards and each sees the truth about what they are allowed to know.
 *
 * The sweep status sits under the header rather than at the bottom. An empty alerts list is only
 * reassuring if you know the sweep ran — "nothing is wrong" and "nothing has been checked" look
 * identical otherwise, and only one of them is good news.
 */
export default function IntelligencePage() {
  const { can } = useSession();
  const [period, setPeriod] = useState<PeriodKind>(PeriodKind.ThisMonth);

  const dashboard = useIntelligenceDashboard({ period });

  if (!can(Permission.intelligenceView)) return <NoAccess />;

  // A 404 is the normal answer for an organization without the feature, not an error to retry.
  if (dashboard.error instanceof ApiError && dashboard.error.status === 404) {
    return (
      <>
        <PageHeader title="Intelligence" description="Workforce and project intelligence." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Intelligence"
        description="What the figures say about your organization, and what needs attention."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Period"
              containerClassName="w-40"
              value={String(period)}
              onChange={(event) => setPeriod(Number(event.target.value) as PeriodKind)}
            >
              {[
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

          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {can(Permission.intelligenceAsk) && (
          <Link
            href="/intelligence/ask"
            className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-field] bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Sparkles aria-hidden className="size-4" />
            Ask a question
          </Link>
        )}
        <Link
          href="/intelligence/alerts"
          className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-field] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Bell aria-hidden className="size-4" />
          All alerts
        </Link>
        <Link
          href="/intelligence/insights"
          className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-field] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <TrendingUp aria-hidden className="size-4" />
          Analytics
        </Link>
      </div>

      <QueryBoundary
        isLoading={dashboard.isLoading}
        error={dashboard.error}
        data={dashboard.data}
        onRetry={() => dashboard.refetch()}
        loadingFallback={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        }
      >
        {(data) => (
          <div className="space-y-5">
            <SweepStatus runs={data.runs} />

            <WithheldNotice withheld={data.withheld} />

            {data.headline.length > 0 && (
              <section aria-labelledby="headline-heading">
                <h2 id="headline-heading" className="sr-only">
                  Headline figures
                </h2>
                <FigureGrid figures={data.headline} />
              </section>
            )}

            {data.openAlerts.length > 0 ? (
              <SectionCard
                title="Needs attention"
                description={`${data.openAlerts.length} open alert${data.openAlerts.length === 1 ? "" : "s"}, most severe first.`}
                action={
                  <Link
                    href="/intelligence/alerts"
                    className="text-sm font-medium text-brand-700 hover:text-brand-800"
                  >
                    See all
                  </Link>
                }
              >
                <div className="space-y-3">
                  {data.openAlerts.slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} canManage={false} />
                  ))}
                </div>
              </SectionCard>
            ) : (
              <NothingDetected
                title="Nothing needs attention"
                description="No open alerts. Check the sweep times above if that seems surprising."
              />
            )}

            {data.topRisks.length > 0 && (
              <SectionCard
                title="Elevated risk"
                description="Estimates from measured figures, with the evidence behind each one. Not facts, and not decisions."
                action={
                  <Link
                    href="/intelligence/risks"
                    className="text-sm font-medium text-brand-700 hover:text-brand-800"
                  >
                    See all
                  </Link>
                }
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.topRisks.slice(0, 4).map((risk) => (
                    <RiskCard key={risk.id} risk={risk} />
                  ))}
                </div>
              </SectionCard>
            )}

            {data.workforce.length > 0 && (
              <SectionCard title="Workforce and attendance" description={data.periodLabel}>
                <FigureGrid figures={data.workforce} />
              </SectionCard>
            )}

            {data.work.length > 0 && (
              <SectionCard title="Projects and tasks" description={data.periodLabel}>
                <FigureGrid figures={data.work} />
              </SectionCard>
            )}

            {data.recentInsights.length > 0 && (
              <SectionCard title="Observations" description="What the sweep noticed.">
                <ul className="space-y-2">
                  {data.recentInsights.map((insight) => (
                    <li key={insight.id} className="text-sm">
                      <p className="font-medium text-slate-900">{insight.title}</p>
                      <p className="mt-0.5 text-slate-600">{insight.summary}</p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
