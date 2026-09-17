"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { useAuditActions, useAuditLog } from "@/hooks/use-workeva";
import { formatDateTime } from "@/lib/format";
import { Permission } from "@/lib/permissions";

function humanise(action: string) {
  return action.replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Metadata is small JSON written by the API; rendered as text, never as markup. */
function summarise(metadata: string | null) {
  if (!metadata) return "—";
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return Object.entries(parsed).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
  } catch {
    return metadata;
  }
}

export default function AuditPage() {
  const { can, me } = useSession();
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const actions = useAuditActions();
  const log = useAuditLog({ action: action || undefined, from: from || undefined, to: to || undefined, page, pageSize: 50 });
  const timezone = me?.active?.timezone;

  if (!can(Permission.auditView)) return <NoAccess />;

  return (
    <>
      <PageHeader title="Audit trail" description="A permanent record of consequential actions in your company." />
      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 md:grid-cols-4 md:items-end">
          <Select label="Action" containerClassName="col-span-2" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {(actions.data ?? []).map((a) => <option key={a} value={a}>{humanise(a)}</option>)}
          </Select>
          <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <QueryBoundary isLoading={log.isLoading} error={log.error} data={log.data} onRetry={() => log.refetch()}
          isEmpty={(d) => d.items.length === 0}
          emptyState={<EmptyState icon={<ShieldCheck aria-hidden className="size-5" />} title="No audit entries match" />}>
          {(data) => (
            <>
              <DataTable caption="Audit trail" rows={data.items} getRowKey={(r) => r.id}
                columns={[
                  { key: "when", header: "When", render: (r) => <span className="whitespace-nowrap numeric">{formatDateTime(r.createdAt, timezone)}</span> },
                  { key: "who", header: "Actor", render: (r) => r.actorLabel ?? "System" },
                  { key: "what", header: "Action", render: (r) => <span className="font-medium text-slate-900">{humanise(r.action)}</span> },
                  { key: "resource", header: "Resource", hideBelow: "lg", render: (r) => r.resourceType },
                  { key: "details", header: "Details", hideBelow: "xl", render: (r) => <span className="line-clamp-2 text-xs text-slate-500">{summarise(r.metadata)}</span> },
                ]}
                renderMobileRow={(r) => (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{humanise(r.action)}</p>
                    <p className="text-xs text-slate-500">{r.actorLabel ?? "System"} · {formatDateTime(r.createdAt, timezone)}</p>
                  </div>
                )} />
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>
    </>
  );
}
