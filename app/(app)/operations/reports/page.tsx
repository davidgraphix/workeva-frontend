"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { ReportDetail, ReportStatusBadge, shiftLabel } from "@/components/features/operations";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/data-table";
import { Card, CardBody } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useCsvDownload } from "@/hooks/use-api";
import { useEmployees } from "@/hooks/use-workeva";
import { useOperationActivities, useOperationLocations, useOperationReports } from "@/hooks/use-operations";
import { formatDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { OperationReportStatus, OperationShift, type OperationReportResponse } from "@/lib/types";

export default function OperationReportsPage() {
  const { can } = useSession();
  const toast = useToast();
  const download = useCsvDownload();

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    operationLocationId: "",
    employeeId: "",
    activityId: "",
    shift: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<OperationReportResponse | null>(null);

  const locations = useOperationLocations({ pageSize: 100 });
  const activities = useOperationActivities(undefined, false);
  const employees = useEmployees({ pageSize: 100 });

  const queryFilters = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    operationLocationId: filters.operationLocationId || undefined,
    employeeId: filters.employeeId || undefined,
    activityId: filters.activityId || undefined,
    shift: filters.shift === "" ? undefined : Number(filters.shift),
    status: filters.status === "" ? undefined : Number(filters.status),
    page,
    pageSize: 20,
  };

  const reports = useOperationReports(queryFilters);

  if (!can(Permission.operationsReportView)) return <NoAccess />;

  const set = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const exportQuery = new URLSearchParams(
    Object.entries({ ...queryFilters, page: undefined, pageSize: undefined })
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return (
    <>
      <PageHeader
        title="Field reports"
        description="Every shift report your scope covers."
        actions={
          can(Permission.operationsReportExport) ? (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await download(`/api/operations/reports/export.csv${exportQuery ? `?${exportQuery}` : ""}`);
                } catch {
                  toast.error("We couldn't prepare that export.");
                }
              }}
            >
              <Download aria-hidden className="size-4" /> Export CSV
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="From" type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} />
          <Input label="To" type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} />

          <Select label="Location" value={filters.operationLocationId} onChange={(e) => set("operationLocationId", e.target.value)}>
            <option value="">All locations</option>
            {(locations.data?.items ?? []).map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>

          <Select label="Employee" value={filters.employeeId} onChange={(e) => set("employeeId", e.target.value)}>
            <option value="">Everyone in my scope</option>
            {(employees.data?.items ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>

          <Select label="Activity" value={filters.activityId} onChange={(e) => set("activityId", e.target.value)}>
            <option value="">All activities</option>
            {(activities.data ?? []).map((activity) => (
              <option key={activity.id} value={activity.id}>{activity.name}</option>
            ))}
          </Select>

          <Select label="Shift" value={filters.shift} onChange={(e) => set("shift", e.target.value)}>
            <option value="">Both shifts</option>
            <option value={String(OperationShift.Morning)}>Morning</option>
            <option value={String(OperationShift.Evening)}>Evening</option>
          </Select>

          <Select label="Status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">Any status</option>
            <option value={String(OperationReportStatus.Submitted)}>Awaiting review</option>
            <option value={String(OperationReportStatus.Approved)}>Approved</option>
            <option value={String(OperationReportStatus.Returned)}>Returned</option>
          </Select>

          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ from: "", to: "", operationLocationId: "", employeeId: "", activityId: "", shift: "", status: "" });
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardBody>
      </Card>

      <QueryBoundary
        isLoading={reports.isLoading}
        error={reports.error}
        data={reports.data}
        onRetry={() => reports.refetch()}
        loadingFallback={<div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>}
      >
        {(data) =>
          data.items.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<FileText aria-hidden className="size-6 text-slate-500" />}
                  title="No reports match"
                  description="Try a wider date range, or clear the filters."
                />
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Cards on a phone, a table from medium up - same data either way. */}
              <ul className="space-y-2 md:hidden">
                {data.items.map((report) => (
                  <li key={report.id}>
                    <Card>
                      <CardBody className="py-3">
                        <button type="button" className="w-full text-left" onClick={() => setOpen(report)}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{report.employeeName}</p>
                              <p className="text-xs text-slate-600">
                                {report.operationLocationName} · {shiftLabel(report.shift)} · {formatDate(report.reportDate)}
                              </p>
                            </div>
                            <ReportStatusBadge status={report.status} />
                          </div>
                        </button>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-hidden rounded-[--radius-card] border border-slate-200 bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Date</th>
                      <th scope="col" className="px-4 py-2.5">Shift</th>
                      <th scope="col" className="px-4 py-2.5">Location</th>
                      <th scope="col" className="px-4 py-2.5">Employee</th>
                      <th scope="col" className="px-4 py-2.5">Work</th>
                      <th scope="col" className="px-4 py-2.5">Status</th>
                      <th scope="col" className="px-4 py-2.5"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.items.map((report) => (
                      <tr key={report.id}>
                        <td className="px-4 py-2.5">{formatDate(report.reportDate)}</td>
                        <td className="px-4 py-2.5">{shiftLabel(report.shift)}</td>
                        <td className="px-4 py-2.5">{report.operationLocationName}</td>
                        <td className="px-4 py-2.5">{report.employeeName}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {report.lines.map((line) => `${line.activityName} ${line.quantity}${line.unit}`).join(", ")}
                        </td>
                        <td className="px-4 py-2.5"><ReportStatusBadge status={report.status} /></td>
                        <td className="px-4 py-2.5 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setOpen(report)}>
                            {report.canReview ? "Review" : "Open"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                totalCount={data.totalCount}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </>
          )
        }
      </QueryBoundary>

      {open && (
        <Dialog
          open
          onClose={() => setOpen(null)}
          title={`${open.employeeName} · ${shiftLabel(open.shift)}`}
          description={`${open.operationLocationName} · ${formatDate(open.reportDate)}`}
          footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}
        >
          <ReportDetail report={open} onReviewed={() => setOpen(null)} />
        </Dialog>
      )}
    </>
  );
}
