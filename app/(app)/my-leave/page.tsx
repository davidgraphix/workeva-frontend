"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { CancelLeaveButton, LeaveRequestDialog } from "@/components/features/shared";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { CardSkeleton, EmptyState, ErrorState, QueryBoundary } from "@/components/ui/states";
import { LeaveStatusBadge } from "@/components/ui/status";
import { useLeaveRequests, useMyLeaveBalances } from "@/hooks/use-workeva";
import { formatDays, formatPlainDate } from "@/lib/format";

export default function MyLeavePage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const balances = useMyLeaveBalances();
  const requests = useLeaveRequests({ page, pageSize: 20 }, "me");

  return (
    <>
      <PageHeader
        title="My leave"
        description="Your balances and requests."
        actions={<Button onClick={() => setOpen(true)}><Plus aria-hidden className="size-4" /> Request leave</Button>}
      />

      <section aria-labelledby="balances-heading" className="mb-5">
        <h2 id="balances-heading" className="sr-only">Leave balances</h2>
        {balances.isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : balances.error ? (
          <Card><ErrorState error={balances.error} onRetry={() => balances.refetch()} /></Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {(balances.data ?? []).map((b) => {
              const percent = b.allocatedDays > 0 ? Math.min(100, ((b.usedDays + b.pendingDays) / b.allocatedDays) * 100) : 0;
              return (
                <Card key={b.leaveTypeId}>
                  <CardBody className="p-4">
                    <p className="text-xs font-medium text-slate-500">{b.leaveTypeName}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900 numeric">{b.remainingDays}</p>
                    <p className="text-xs text-slate-500">
                      {b.allocatedDays > 0 ? `of ${b.allocatedDays} days left` : "No fixed allowance"}
                    </p>
                    {b.allocatedDays > 0 && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        <div className="h-full bg-brand-600" style={{ width: `${percent}%` }} />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">{b.usedDays} used · {b.pendingDays} pending</p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <CardHeader title="My requests" />
        <QueryBoundary
          isLoading={requests.isLoading}
          error={requests.error}
          data={requests.data}
          onRetry={() => requests.refetch()}
          isEmpty={(d) => d.items.length === 0}
          emptyState={
            <EmptyState
              title="No leave requests yet"
              description="When you need time off, request it here and your manager will be notified."
              action={<Button size="sm" onClick={() => setOpen(true)}>Request leave</Button>}
            />
          }
        >
          {(data) => (
            <>
              <DataTable
                caption="My leave requests"
                rows={data.items}
                getRowKey={(r) => r.id}
                columns={[
                  { key: "type", header: "Type", render: (r) => <span className="font-medium text-slate-900">{r.leaveTypeName}</span> },
                  { key: "dates", header: "Dates", render: (r) => `${formatPlainDate(r.startDate)} – ${formatPlainDate(r.endDate)}` },
                  { key: "days", header: "Days", render: (r) => formatDays(r.daysCount) },
                  { key: "status", header: "Status", render: (r) => <LeaveStatusBadge status={r.status} /> },
                  { key: "note", header: "Note", hideBelow: "lg", render: (r) => r.decisionNote ?? "—" },
                  { key: "actions", header: "", align: "right", render: (r) => <CancelLeaveButton request={r} /> },
                ]}
                renderMobileRow={(r) => (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{r.leaveTypeName}</p>
                      <LeaveStatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-500">{formatPlainDate(r.startDate)} – {formatPlainDate(r.endDate)} · {formatDays(r.daysCount)}</p>
                    {r.decisionNote && <p className="text-xs text-slate-600">“{r.decisionNote}”</p>}
                    <div className="-ml-3"><CancelLeaveButton request={r} /></div>
                  </div>
                )}
              />
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>

      <LeaveRequestDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
