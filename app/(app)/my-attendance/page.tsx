"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { ClockCard } from "@/components/features/clock-card";
import { useSession } from "@/components/session-provider";
import { Card, CardHeader } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { AttendanceStatusBadge } from "@/components/ui/status";
import { useAttendance } from "@/hooks/use-workeva";
import { formatDuration, formatPlainDate, formatTime } from "@/lib/format";

export default function MyAttendancePage() {
  const { me } = useSession();
  const timezone = me?.active?.timezone;
  const [page, setPage] = useState(1);
  const history = useAttendance({ page, pageSize: 20 }, "me");

  return (
    <>
      <PageHeader title="My attendance" description="Clock in and out, and see your attendance history." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:order-2">
          <ClockCard />
        </div>

        <Card className="lg:order-1 lg:col-span-2">
          <CardHeader title="History" />
          <QueryBoundary
            isLoading={history.isLoading}
            error={history.error}
            data={history.data}
            onRetry={() => history.refetch()}
            isEmpty={(d) => d.items.length === 0}
            emptyState={<EmptyState title="No attendance yet" description="Your clock-ins will appear here once you start recording attendance." />}
          >
            {(data) => (
              <>
                <DataTable
                  caption="My attendance history"
                  rows={data.items}
                  getRowKey={(r) => r.id}
                  columns={[
                    { key: "date", header: "Date", render: (r) => formatPlainDate(r.workDate) },
                    { key: "status", header: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
                    { key: "in", header: "In", render: (r) => <span className="numeric">{formatTime(r.clockInAt, timezone)}</span> },
                    { key: "out", header: "Out", render: (r) => <span className="numeric">{formatTime(r.clockOutAt, timezone)}</span> },
                    { key: "worked", header: "Worked", align: "right", render: (r) => <span className="numeric">{formatDuration(r.workedMinutes)}</span> },
                    { key: "location", header: "Location", hideBelow: "xl", render: (r) => r.clockInLocationName ?? "—" },
                  ]}
                  renderMobileRow={(r) => (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{formatPlainDate(r.workDate)}</p>
                        <p className="text-xs text-slate-500 numeric">
                          {formatTime(r.clockInAt, timezone)} – {formatTime(r.clockOutAt, timezone)} · {formatDuration(r.workedMinutes)}
                        </p>
                      </div>
                      <AttendanceStatusBadge status={r.status} />
                    </div>
                  )}
                />
                <Pagination {...data} onPageChange={setPage} />
              </>
            )}
          </QueryBoundary>
        </Card>
      </div>
    </>
  );
}
