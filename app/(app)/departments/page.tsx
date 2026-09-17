"use client";

import { useState } from "react";
import { Archive, Building2, Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card } from "@/components/ui/surfaces";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useArchiveDepartment, useDepartments, useEmployees, useSaveDepartment } from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import type { DepartmentResponse } from "@/lib/types";

export default function DepartmentsPage() {
  const { can } = useSession();
  const [showArchived, setShowArchived] = useState(false);
  const departments = useDepartments(showArchived);
  const archive = useArchiveDepartment();
  const toast = useToast();
  const [editing, setEditing] = useState<DepartmentResponse | "new" | null>(null);
  const [archiving, setArchiving] = useState<DepartmentResponse | null>(null);
  const canManage = can(Permission.departmentManage);

  if (!can(Permission.departmentView)) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Departments"
        description="Group people so managers see and manage their own teams."
        actions={
          <>
            <Button variant="ghost" size="sm" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            {canManage && <Button onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> New department</Button>}
          </>
        }
      />

      <Card>
        <QueryBoundary
          isLoading={departments.isLoading}
          error={departments.error}
          data={departments.data}
          onRetry={() => departments.refetch()}
          isEmpty={(d) => d.length === 0}
          emptyState={
            <EmptyState icon={<Building2 aria-hidden className="size-5" />} title="No departments yet"
              description="Create departments like Sales or Operations, then assign a manager to each."
              action={canManage && <Button size="sm" onClick={() => setEditing("new")}>Create a department</Button>} />
          }
        >
          {(data) => (
            <DataTable
              caption="Departments"
              rows={data}
              getRowKey={(d) => d.id}
              columns={[
                { key: "name", header: "Department", render: (d) => (
                  <div>
                    <p className="font-medium text-slate-900">{d.name} {d.isArchived && <Badge className="ml-1">Archived</Badge>}</p>
                    {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                  </div>
                ) },
                { key: "manager", header: "Manager", render: (d) => d.managerName ?? <span className="text-slate-400">No manager</span> },
                { key: "count", header: "Active employees", align: "right", render: (d) => <span className="numeric">{d.employeeCount}</span> },
                { key: "actions", header: "", align: "right", render: (d) => canManage && !d.isArchived && (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`}><Pencil aria-hidden className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiving(d)} aria-label={`Archive ${d.name}`}><Archive aria-hidden className="size-4" /></Button>
                  </div>
                ) },
              ]}
              renderMobileRow={(d) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.managerName ?? "No manager"} · {d.employeeCount} people</p>
                  </div>
                  {canManage && !d.isArchived && <Button size="sm" variant="secondary" onClick={() => setEditing(d)}>Edit</Button>}
                </div>
              )}
            />
          )}
        </QueryBoundary>
      </Card>

      {editing && <DepartmentDialog department={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        title={`Archive ${archiving?.name}?`}
        message="The department will be hidden from lists and can no longer be assigned. Its history in attendance, tasks and reports is kept."
        confirmLabel="Archive department"
        loading={archive.isPending}
        onConfirm={async () => {
          if (!archiving) return;
          try {
            await archive.mutateAsync(archiving.id);
            toast.success("Department archived");
            setArchiving(null);
          } catch (error) {
            toast.error("Couldn't archive", error instanceof ApiError ? error.message : undefined);
            setArchiving(null);
          }
        }}
      />
    </>
  );
}

function DepartmentDialog({ department, onClose }: { department: DepartmentResponse | null; onClose: () => void }) {
  const save = useSaveDepartment();
  const employees = useEmployees({ pageSize: 100, status: 0 });
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: department?.name ?? "", description: department?.description ?? "", managerEmployeeId: department?.managerEmployeeId ?? "" },
  });

  return (
    <Dialog open onClose={onClose} title={department ? `Edit ${department.name}` : "New department"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="department-form" loading={save.isPending}>{department ? "Save" : "Create"}</Button>
        </>
      }>
      <form id="department-form" noValidate className="space-y-4" onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        try {
          await save.mutateAsync({ id: department?.id, name: values.name, description: values.description || null, managerEmployeeId: values.managerEmployeeId || null });
          toast.success(department ? "Department updated" : "Department created");
          onClose();
        } catch (error) {
          setFormError(error instanceof ApiError ? error.message : "Couldn't save the department.");
        }
      })}>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input label="Name" required maxLength={120} error={errors.name?.message} {...register("name", { required: "Enter a department name." })} />
        <Textarea label="Description" rows={2} maxLength={600} {...register("description")} />
        <Select label="Manager" hint="The manager sees this department's attendance, leave and tasks." {...register("managerEmployeeId")}>
          <option value="">No manager</option>
          {(employees.data?.items ?? []).map((e) => <option key={e.id} value={e.id}>{e.fullName}{e.jobTitle ? ` — ${e.jobTitle}` : ""}</option>)}
        </Select>
      </form>
    </Dialog>
  );
}
