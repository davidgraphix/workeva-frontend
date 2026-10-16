"use client";

import { useState } from "react";
import { MapPin, Plus, Users } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { Pagination } from "@/components/ui/data-table";
import { Alert, Badge, Card, CardBody } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useEmployees } from "@/hooks/use-workeva";
import {
  useAssignOperationStaff,
  useOperationLocations,
  useOperationStaff,
  useSaveOperationLocation,
  useUnassignOperationStaff,
  type SaveLocationBody,
} from "@/hooks/use-operations";
import { Permission } from "@/lib/permissions";
import { OperationAssignmentRole, type OperationLocationResponse } from "@/lib/types";

/** The kinds of place the model supports. Farms first, because that is the first use case. */
const LOCATION_TYPES: [number, string][] = [
  [0, "Farm"],
  [1, "Construction site"],
  [2, "Warehouse"],
  [3, "Factory"],
  [4, "Branch"],
  [5, "Field sales area"],
  [6, "Logistics"],
  [7, "Other"],
];

function LocationDialog({
  open,
  onClose,
  location,
}: {
  open: boolean;
  onClose: () => void;
  location?: OperationLocationResponse | null;
}) {
  const toast = useToast();
  const save = useSaveOperationLocation();

  const [form, setForm] = useState<SaveLocationBody>(() => ({
    name: location?.name ?? "",
    type: location?.type ?? 0,
    code: location?.code ?? null,
    address: location?.address ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    size: location?.size ?? null,
    sizeUnit: location?.sizeUnit ?? null,
    notes: location?.notes ?? null,
    isActive: location?.isActive ?? true,
  }));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SaveLocationBody>(key: K, value: SaveLocationBody[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setError(null);

    if (form.name.trim().length === 0) {
      setError("Give the location a name.");
      return;
    }

    if (form.size !== null && (form.sizeUnit ?? "").trim().length === 0) {
      setError("Say what the size is measured in, for example hectares.");
      return;
    }

    try {
      await save.mutateAsync({ id: location?.id, body: { ...form, name: form.name.trim() } });
      toast.success(location ? "Location updated" : "Location added");
      onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "We couldn't save that location.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={location ? "Edit location" : "Add a location"}
      description="Farms, sites, warehouses - anywhere work is reported from."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending}>{location ? "Save changes" : "Add location"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger" title="Check the details">{error}</Alert>}

        <Input label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} required />

        <Select label="Type" value={String(form.type)} onChange={(e) => set("type", Number(e.target.value))}>
          {LOCATION_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>

        <Input label="Reference code (optional)" value={form.code ?? ""} onChange={(e) => set("code", e.target.value || null)} />
        <Input label="Address (optional)" value={form.address ?? ""} onChange={(e) => set("address", e.target.value || null)} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Size (optional)"
            type="number"
            step="0.01"
            min={0}
            value={form.size ?? ""}
            onChange={(e) => set("size", e.target.value === "" ? null : Number(e.target.value))}
          />
          <Input
            label="Unit"
            placeholder="hectares"
            value={form.sizeUnit ?? ""}
            onChange={(e) => set("sizeUnit", e.target.value || null)}
          />
        </div>

        <Textarea label="Notes (optional)" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />

        <Checkbox
          label="Active"
          description="Inactive locations stop accepting new reports, and keep their history."
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
        />
      </div>
    </Dialog>
  );
}

function StaffDialog({ location, onClose }: { location: OperationLocationResponse; onClose: () => void }) {
  const toast = useToast();
  const assignments = useOperationStaff({ locationId: location.id });
  const employees = useEmployees({ pageSize: 100 });
  const assign = useAssignOperationStaff();
  const unassign = useUnassignOperationStaff();

  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState(String(OperationAssignmentRole.Worker));
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    if (!employeeId) {
      setError("Choose an employee to assign.");
      return;
    }

    try {
      await assign.mutateAsync({ operationLocationId: location.id, employeeId, role: Number(role) });
      toast.success("Staff assigned");
      setEmployeeId("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "We couldn't assign that person.");
    }
  }

  const active = (assignments.data ?? []).filter((a) => a.isActive);

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Staff at ${location.name}`}
      description="Only assigned staff can file reports for this location."
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      <div className="space-y-4">
        {error && <Alert tone="danger" title="Check the assignment">{error}</Alert>}

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Choose someone</option>
            {(employees.data?.items ?? [])
              .filter((employee) => !active.some((a) => a.employeeId === employee.id))
              .map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
          </Select>

          <Select label="Role here" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={String(OperationAssignmentRole.Worker)}>Worker - files reports</option>
            <option value={String(OperationAssignmentRole.Supervisor)}>Supervisor - also reviews reports</option>
          </Select>

          <Button onClick={add} loading={assign.isPending}>
            <Plus aria-hidden className="size-4" /> Assign
          </Button>
        </div>

        <QueryBoundary
          isLoading={assignments.isLoading}
          error={assignments.error}
          data={assignments.data}
          onRetry={() => assignments.refetch()}
          loadingFallback={<CardSkeleton />}
        >
          {(data) =>
            data.filter((a) => a.isActive).length === 0 ? (
              <EmptyState
                icon={<Users aria-hidden className="size-6 text-slate-500" />}
                title="Nobody assigned yet"
                description="Assign the people who work at this location."
              />
            ) : (
              <ul className="divide-y divide-slate-200">
                {data.filter((a) => a.isActive).map((assignment) => (
                  <li key={assignment.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{assignment.employeeName}</p>
                      <p className="text-xs text-slate-600">
                        {assignment.role === OperationAssignmentRole.Supervisor ? "Supervisor" : "Worker"}
                        {assignment.jobTitle ? ` · ${assignment.jobTitle}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={unassign.isPending}
                      onClick={async () => {
                        await unassign.mutateAsync(assignment.id);
                        toast.success("Assignment ended");
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </div>
    </Dialog>
  );
}

export default function OperationLocationsPage() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const locations = useOperationLocations({ search: search || undefined, page, pageSize: 20 });

  const [editing, setEditing] = useState<OperationLocationResponse | "new" | null>(null);
  const [staffFor, setStaffFor] = useState<OperationLocationResponse | null>(null);

  if (!can(Permission.operationsView)) return <NoAccess />;

  const canManage = can(Permission.operationsLocationManage);
  const canAssign = can(Permission.operationsStaffAssign);

  return (
    <>
      <PageHeader
        title="Locations"
        description="Farms, sites and other places work is reported from."
        actions={
          canManage ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" /> Add location
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          label="Search"
          placeholder="Name or code"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        />
      </div>

      <QueryBoundary
        isLoading={locations.isLoading}
        error={locations.error}
        data={locations.data}
        onRetry={() => locations.refetch()}
        loadingFallback={<div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>}
      >
        {(data) =>
          data.items.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<MapPin aria-hidden className="size-6 text-slate-500" />}
                  title="No locations yet"
                  description={canManage ? "Add your first farm or site to start collecting field reports." : "An administrator has not added any locations yet."}
                  action={canManage ? <Button onClick={() => setEditing("new")}>Add location</Button> : undefined}
                />
              </CardBody>
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {data.items.map((location) => (
                  <li key={location.id}>
                    <Card>
                      <CardBody className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">{location.name}</p>
                            <Badge tone={location.isActive ? "success" : "neutral"}>
                              {location.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {location.typeLabel}
                            {location.address ? ` · ${location.address}` : ""}
                            {location.size ? ` · ${location.size} ${location.sizeUnit ?? ""}` : ""}
                            {` · ${location.assignedStaffCount} assigned`}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {canAssign && (
                            <Button variant="secondary" size="sm" onClick={() => setStaffFor(location)}>
                              <Users aria-hidden className="size-4" /> Staff
                            </Button>
                          )}
                          {canManage && (
                            <Button variant="ghost" size="sm" onClick={() => setEditing(location)}>Edit</Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>

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

      {editing && (
        <LocationDialog
          open
          onClose={() => setEditing(null)}
          location={editing === "new" ? null : editing}
        />
      )}

      {staffFor && <StaffDialog location={staffFor} onClose={() => setStaffFor(null)} />}
    </>
  );
}
