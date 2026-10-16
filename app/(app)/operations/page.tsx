"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Sprout } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Input } from "@/components/ui/field";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useOperationsDashboard } from "@/hooks/use-operations";
import { formatDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";

/**
 * What happened in the field today. Every number here is counted from submitted rows -
 * "expected" is the number of active assignments at active locations, so "missing" is a fact
 * about who has not reported rather than a projection.
 */
export default function OperationsDashboardPage() {
  const { can } = useSession();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dashboard = useOperationsDashboard(date);

  if (!can(Permission.operationsView)) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Operations"
        description="Field reporting across your locations."
        actions={
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-44"
          />
        }
      />

      <QueryBoundary
        isLoading={dashboard.isLoading}
        error={dashboard.error}
        data={dashboard.data}
        onRetry={() => dashboard.refetch()}
        loadingFallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        }
      >
        {(data) => (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Active locations" value={data.activeLocations} />
              <StatCard label="Staff assigned" value={data.staffAssigned} />
              <StatCard label={`Reports on ${formatDate(data.date)}`} value={data.reportsToday} />
              <StatCard label="Awaiting review" value={data.pendingReview} tone={data.pendingReview > 0 ? "warning" : "neutral"} />
              <StatCard label="Morning" value={data.morningReportsToday} />
              <StatCard label="Evening" value={data.eveningReportsToday} />
              <StatCard label="Approved" value={data.approvedToday} tone="success" />
              <StatCard label="Returned" value={data.returnedToday} tone={data.returnedToday > 0 ? "warning" : "neutral"} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Work reported"
                  description={`Totals for ${formatDate(data.date)}, by activity.`}
                />
                <CardBody>
                  {data.activityTotals.length === 0 ? (
                    <EmptyState
                      icon={<Sprout aria-hidden className="size-6 text-slate-500" />}
                      title="Nothing reported for this day"
                      description="Totals appear as field staff submit their shifts."
                    />
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {data.activityTotals.map((total) => (
                        <li key={total.activityId} className="flex items-baseline justify-between gap-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{total.activityName}</p>
                            <p className="text-xs text-slate-600">
                              {total.reportCount} {total.reportCount === 1 ? "entry" : "entries"}
                            </p>
                          </div>
                          <p className="numeric text-sm font-semibold text-slate-900">
                            {total.quantity} <span className="font-normal text-slate-600">{total.unit}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="By location" description="Reports filed, and staff assigned." />
                <CardBody>
                  {data.locationTotals.length === 0 ? (
                    <EmptyState
                      icon={<MapPin aria-hidden className="size-6 text-slate-500" />}
                      title="No active locations"
                      description="Add a farm or site to start collecting field reports."
                      action={
                        can(Permission.operationsLocationManage) ? (
                          <Link href="/operations/locations" className="text-sm font-medium text-brand-700 underline">
                            Add a location
                          </Link>
                        ) : undefined
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {data.locationTotals.map((location) => (
                        <li key={location.operationLocationId} className="flex items-baseline justify-between gap-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{location.name}</p>
                            <p className="text-xs text-slate-600">
                              {location.staffAssigned} assigned · {location.reportCount} reports in total
                            </p>
                          </div>
                          <p className="numeric text-sm font-semibold text-slate-900">{location.reportsToday}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>

            {data.expectedReportsToday > 0 && (
              <p className="mt-4 text-sm text-slate-600">
                {data.reportsToday} of {data.expectedReportsToday * 2} possible shift reports filed for{" "}
                {formatDate(data.date)} ({data.expectedReportsToday} assignments × 2 shifts).
              </p>
            )}
          </>
        )}
      </QueryBoundary>
    </>
  );
}
