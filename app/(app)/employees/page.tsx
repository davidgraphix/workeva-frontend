"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailPlus, Plus, RotateCw, Search, Users, XCircle } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { EmployeeDialog, InviteEmployeeDialog } from "@/components/features/employee-forms";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/field";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/surfaces";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { EmployeeStatusBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { useDepartments, useEmployees, useInvitations, useResendInvitation, useRevokeInvitation } from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { EmployeeStatus, InvitationStatus, employeeStatusLabels, type InvitationResponse } from "@/lib/types";

function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useSession();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(searchParams.get("invite") === "1");
  const [createOpen, setCreateOpen] = useState(false);

  // Debounced so each keystroke doesn't hit the API.
  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const departments = useDepartments();
  const employees = useEmployees({
    search: search || undefined,
    departmentId: departmentId || undefined,
    status: status === "" ? undefined : (Number(status) as EmployeeStatus),
    page,
    pageSize: 20,
  });

  if (!can(Permission.employeeView)) return <NoAccess />;

  const hasFilters = Boolean(search || departmentId || status);

  return (
    <>
      <PageHeader
        title="Employees"
        description={employees.data ? `${employees.data.totalCount} people` : undefined}
        actions={
          <>
            {can(Permission.employeeCreate) && (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}><Plus aria-hidden className="size-4" /> Add</Button>
            )}
            {can(Permission.employeeInvite) && (
              <Button onClick={() => setInviteOpen(true)}><MailPlus aria-hidden className="size-4" /> Invite</Button>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <label htmlFor="employee-search" className="sr-only">Search employees</label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="employee-search"
              type="search"
              placeholder="Search by name, email, ID or job title"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="block h-10 w-full rounded-md border-0 bg-white pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select label="Department" containerClassName="sm:w-44" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Status" containerClassName="sm:w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Any status</option>
              {[EmployeeStatus.Active, EmployeeStatus.Suspended, EmployeeStatus.Inactive, EmployeeStatus.Terminated].map((s) => (
                <option key={s} value={s}>{employeeStatusLabels[s]}</option>
              ))}
            </Select>
          </div>
        </div>

        <QueryBoundary
          isLoading={employees.isLoading}
          error={employees.error}
          data={employees.data}
          onRetry={() => employees.refetch()}
          isEmpty={(d) => d.items.length === 0}
          emptyState={
            hasFilters ? (
              <EmptyState title="No one matches those filters" description="Try a different search or clear the filters." />
            ) : (
              <EmptyState
                icon={<Users aria-hidden className="size-5" />}
                title="No employees yet"
                description="Invite your first employee to start tracking attendance and managing tasks."
                action={can(Permission.employeeInvite) && <Button size="sm" onClick={() => setInviteOpen(true)}>Invite an employee</Button>}
              />
            )
          }
        >
          {(data) => (
            <>
              <DataTable
                caption="Employees"
                rows={data.items}
                getRowKey={(e) => e.id}
                onRowClick={(e) => router.push(`/employees/${e.id}`)}
                columns={[
                  {
                    key: "name", header: "Name", render: (e) => (
                      <div className="flex items-center gap-3">
                        <Avatar name={e.fullName} src={e.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{e.fullName}</p>
                          <p className="truncate text-xs text-slate-500">{e.email}</p>
                        </div>
                      </div>
                    ),
                  },
                  { key: "id", header: "ID", hideBelow: "lg", render: (e) => <span className="numeric">{e.employeeNumber}</span> },
                  { key: "title", header: "Job title", render: (e) => e.jobTitle ?? "—" },
                  { key: "dept", header: "Department", hideBelow: "lg", render: (e) => e.departmentName ?? "—" },
                  { key: "status", header: "Status", render: (e) => <EmployeeStatusBadge status={e.status} /> },
                  { key: "account", header: "Account", hideBelow: "xl", render: (e) => e.hasAccount ? <Badge tone="success">Joined</Badge> : <Badge>No account</Badge> },
                ]}
                renderMobileRow={(e) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={e.fullName} src={e.photoUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{e.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{[e.jobTitle, e.departmentName].filter(Boolean).join(" · ") || e.email}</p>
                    </div>
                    <EmployeeStatusBadge status={e.status} />
                  </div>
                )}
              />
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>

      {can(Permission.employeeInvite) && <PendingInvitations />}

      <InviteEmployeeDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EmployeeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function PendingInvitations() {
  const invitations = useInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const toast = useToast();
  const [revoking, setRevoking] = useState<InvitationResponse | null>(null);

  const pending = (invitations.data ?? []).filter((i) => i.status === InvitationStatus.Pending || i.status === InvitationStatus.Expired);
  if (pending.length === 0) return null;

  return (
    <Card className="mt-5">
      <CardHeader title="Pending invitations" description="People who haven't joined yet." />
      <ul className="divide-y divide-slate-100">
        {pending.map((invitation) => (
          <li key={invitation.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{invitation.firstName} {invitation.lastName}</p>
              <p className="truncate text-xs text-slate-500">
                {invitation.email} · {invitation.roleName} ·{" "}
                {invitation.status === InvitationStatus.Expired ? "Expired" : `Expires ${formatDate(invitation.expiresAt)}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" loading={resend.isPending && resend.variables === invitation.id}
                onClick={async () => {
                  try {
                    await resend.mutateAsync(invitation.id);
                    toast.success("Invitation resent", "The previous link no longer works.");
                  } catch (error) {
                    toast.error("Couldn't resend", error instanceof ApiError ? error.message : undefined);
                  }
                }}>
                <RotateCw aria-hidden className="size-4" /> Resend
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRevoking(invitation)}>
                <XCircle aria-hidden className="size-4" /> Revoke
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title="Revoke this invitation?"
        message={`${revoking?.email} won't be able to use their invitation link. You can invite them again later.`}
        confirmLabel="Revoke invitation"
        loading={revoke.isPending}
        onConfirm={async () => {
          if (!revoking) return;
          try {
            await revoke.mutateAsync(revoking.id);
            toast.success("Invitation revoked");
            setRevoking(null);
          } catch (error) {
            toast.error("Couldn't revoke", error instanceof ApiError ? error.message : undefined);
          }
        }}
      />
    </Card>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={null}>
      <EmployeesContent />
    </Suspense>
  );
}
