"use client";

import { useState } from "react";
import { Sprout } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { AssignmentCard, ReportStatusBadge, shiftLabel } from "@/components/features/operations";
import { useSession } from "@/components/session-provider";
import { Card, CardBody } from "@/components/ui/surfaces";
import { Pagination } from "@/components/ui/data-table";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useMyOperationAssignments, useMyOperationReports } from "@/hooks/use-operations";
import { formatDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";

/**
 * The field worker's page, and the one most likely to be used on a phone with one bar of
 * signal: the locations they are assigned to, what each shift still needs, and the history of
 * what they have filed.
 */
export default function MyOperationsPage() {
  const { can, me } = useSession();
  const assignments = useMyOperationAssignments();
  const [page, setPage] = useState(1);
  const reports = useMyOperationReports({ page, pageSize: 10 });

  if (!can(Permission.operationsView)) return <NoAccess />;
  if (!me?.active?.employeeId) {
    return (
      <>
        <PageHeader title="My operations" description="Report the work you do in the field." />
        <Card>
          <CardBody>
            <EmptyState
              icon={<Sprout aria-hidden className="size-6 text-slate-500" />}
              title="No employee record yet"
              description="Field reporting needs an employee record. Ask an administrator to set one up."
            />
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="My operations" description="Report the work you do in the field." />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Today</h2>
        <QueryBoundary isLoading={assignments.isLoading} error={assignments.error} data={assignments.data} onRetry={() => assignments.refetch()} loadingFallback={<div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>}>
          {(data) =>
            data.length === 0 ? (
              <Card>
                <CardBody>
                  <EmptyState
                    icon={<Sprout aria-hidden className="size-6 text-slate-500" />}
                    title="You have no locations assigned"
                    description="When an administrator assigns you to a farm or site, its morning and evening reports will appear here."
                  />
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.map((assignment) => (
                  <AssignmentCard
                    key={assignment.operationLocationId}
                    assignment={assignment}
                    reports={reports.data?.items ?? []}
                  />
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">My reports</h2>
        <QueryBoundary isLoading={reports.isLoading} error={reports.error} data={reports.data} onRetry={() => reports.refetch()} loadingFallback={<CardSkeleton />}>
          {(data) =>
            data.items.length === 0 ? (
              <Card>
                <CardBody>
                  <EmptyState icon={<Sprout aria-hidden className="size-6 text-slate-500" />} title="Nothing reported yet" description="Your submitted reports will be listed here." />
                </CardBody>
              </Card>
            ) : (
              <>
                <ul className="space-y-2">
                  {data.items.map((report) => (
                    <li key={report.id}>
                      <Card>
                        <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {report.operationLocationName} · {shiftLabel(report.shift)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {formatDate(report.reportDate)} ·{" "}
                              {report.lines.map((line) => `${line.activityName} ${line.quantity}${line.unit}`).join(", ")}
                            </p>
                            {report.reviewNote && (
                              <p className="mt-1 text-xs text-warning-800">Supervisor: {report.reviewNote}</p>
                            )}
                          </div>
                          <ReportStatusBadge status={report.status} />
                        </CardBody>
                      </Card>
                    </li>
                  ))}
                </ul>
                <Pagination page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} totalPages={data.totalPages} onPageChange={setPage} />
              </>
            )
          }
        </QueryBoundary>
      </section>
    </>
  );
}
