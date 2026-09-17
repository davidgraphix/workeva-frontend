"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Check, LocateFixed, MapPin, Pencil, Plus } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { EmptyState, ErrorState, PageSkeleton, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useChangeMemberRole,
  useCompanySettings,
  useDeactivateLocation,
  useLeaveTypes,
  useLocations,
  useMembers,
  useOrganization,
  useRoles,
  useSaveLeaveType,
  useSaveLocation,
  useUpdateOrganization,
  useUpdateRolePermissions,
  useUpdateSettings,
} from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { dayLabels, isDayInMask, toggleDayInMask } from "@/lib/format";
import { Permission, RoleKey, permissionGroups, permissionLabels } from "@/lib/permissions";
import { AccessScope, type CompanySettingsResponse, type LeaveTypeResponse, type RoleResponse, type WorkLocationResponse } from "@/lib/types";
import { cn, requestLocation } from "@/lib/utils";

const TIMEZONES = ["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Africa/Cairo", "Africa/Casablanca", "Africa/Kigali", "Europe/London", "UTC"];

type Section = "company" | "attendance" | "locations" | "leave" | "roles";

export default function SettingsPage() {
  const { can } = useSession();

  const sections = ([
    ["company", "Company", can(Permission.settingsManage)],
    ["attendance", "Attendance & notifications", can(Permission.settingsManage)],
    ["locations", "Work locations", can(Permission.locationManage)],
    ["leave", "Leave types", can(Permission.leaveManage)],
    ["roles", "Roles & members", can(Permission.roleManage)],
  ] as const).filter(([, , allowed]) => allowed);

  const [section, setSection] = useState<Section>(sections[0]?.[0] ?? "company");

  if (sections.length === 0) return <NoAccess />;

  return (
    <>
      <PageHeader title="Settings" description="Configure how Workeva works for your company." />
      <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Settings sections">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {sections.map(([key, label]) => (
              <li key={key}>
                <button type="button" onClick={() => setSection(key)} aria-current={section === key ? "page" : undefined}
                  className={cn("w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium",
                    section === key ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-100")}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          {section === "company" && <CompanySection />}
          {section === "attendance" && <AttendanceSection />}
          {section === "locations" && <LocationsSection />}
          {section === "leave" && <LeaveTypesSection />}
          {section === "roles" && <RolesSection />}
        </div>
      </div>
    </>
  );
}

function CompanySection() {
  const organization = useOrganization();
  const update = useUpdateOrganization();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Record<string, string>>();

  useEffect(() => {
    if (!organization.data) return;
    const o = organization.data;
    reset({ name: o.name, logoUrl: o.logoUrl ?? "", email: o.email ?? "", phone: o.phone ?? "", country: o.country ?? "", state: o.state ?? "", city: o.city ?? "", address: o.address ?? "", timezone: o.timezone });
  }, [organization.data, reset]);

  if (organization.isLoading) return <PageSkeleton />;
  if (organization.error) return <Card><ErrorState error={organization.error} onRetry={() => organization.refetch()} /></Card>;

  return (
    <Card>
      <CardHeader title="Company information" />
      <CardBody>
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (values) => {
          const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" && k !== "name" ? null : v]));
          try {
            await update.mutateAsync(body);
            toast.success("Company details saved");
          } catch (error) {
            toast.error("Couldn't save", error instanceof ApiError ? error.message : undefined);
          }
        })}>
          <Input label="Company name" required error={errors.name?.message} {...register("name", { required: "Enter your company name." })} />
          <Input label="Logo URL" type="url" hint="A link to your logo image, shown in the navigation." {...register("logoUrl")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" {...register("email")} />
            <Input label="Phone" type="tel" {...register("phone")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Country" {...register("country")} />
            <Input label="State" {...register("state")} />
            <Input label="City" {...register("city")} />
          </div>
          <Input label="Address" {...register("address")} />
          <Select label="Timezone" hint="Changing this changes how working days and lateness are calculated from now on." {...register("timezone")}>
            {TIMEZONES.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
          </Select>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>Save changes</Button>
        </form>
      </CardBody>
    </Card>
  );
}

function AttendanceSection() {
  const settings = useCompanySettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const [draft, setDraft] = useState<CompanySettingsResponse | null>(settings.data ?? null);
  const [draftSource, setDraftSource] = useState(settings.data);

  // Fresh settings from the server replace the draft.
  if (settings.data !== draftSource) {
    setDraftSource(settings.data);
    if (settings.data) setDraft(settings.data);
  }

  if (settings.isLoading || !draft) return settings.error ? <Card><ErrorState error={settings.error} onRetry={() => settings.refetch()} /></Card> : <PageSkeleton />;

  const set = <K extends keyof CompanySettingsResponse>(key: K, value: CompanySettingsResponse[K]) => setDraft({ ...draft, [key]: value });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Working hours" />
        <CardBody className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Working days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {dayLabels.map((day, index) => {
                const on = isDayInMask(draft.workingDaysMask, index);
                return (
                  <button key={day} type="button" aria-pressed={on} onClick={() => set("workingDaysMask", toggleDayInMask(draft.workingDaysMask, index))}
                    className={cn("flex h-10 min-w-12 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium ring-1 ring-inset",
                      on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")}>
                    {on && <Check aria-hidden className="size-3.5" />}{day}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Start time" type="time" value={draft.workDayStart.slice(0, 5)} onChange={(e) => set("workDayStart", `${e.target.value}:00`)} />
            <Input label="End time" type="time" value={draft.workDayEnd.slice(0, 5)} onChange={(e) => set("workDayEnd", `${e.target.value}:00`)} />
            <Input label="Grace period (minutes)" type="number" min={0} max={240} value={draft.gracePeriodMinutes} onChange={(e) => set("gracePeriodMinutes", Number(e.target.value))} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Location checks" />
        <CardBody className="space-y-4">
          <Checkbox label="Require location to clock in" description="Employees must be inside a work location's radius. Location is read once, when they tap the button."
            checked={draft.requireLocationForAttendance} onChange={(e) => set("requireLocationForAttendance", e.target.checked)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Review distance (metres)" type="number" min={100} value={draft.suspiciousDistanceMeters}
              hint="Attempts further than this from every location are flagged for review." onChange={(e) => set("suspiciousDistanceMeters", Number(e.target.value))} />
            <Input label="Repeated attempts before review" type="number" min={2} max={50} value={draft.suspiciousFailedAttemptsThreshold}
              onChange={(e) => set("suspiciousFailedAttemptsThreshold", Number(e.target.value))} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Leave and notifications" />
        <CardBody className="space-y-4">
          <Checkbox label="Enforce leave balances" description="Refuse requests that exceed an employee's remaining days." checked={draft.enforceLeaveBalance} onChange={(e) => set("enforceLeaveBalance", e.target.checked)} />
          <Checkbox label="Notify managers when someone clocks in" checked={draft.notifyManagersOnClockIn} onChange={(e) => set("notifyManagersOnClockIn", e.target.checked)} />
          <Checkbox label="Notify managers about late arrivals" description="Also sends an email." checked={draft.notifyManagersOnLateArrival} onChange={(e) => set("notifyManagersOnLateArrival", e.target.checked)} />
          <Checkbox label="Send email notifications" description="Invitations and account emails are always sent." checked={draft.emailNotificationsEnabled} onChange={(e) => set("emailNotificationsEnabled", e.target.checked)} />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button loading={update.isPending} onClick={async () => {
          try {
            await update.mutateAsync(draft);
            toast.success("Settings saved");
          } catch (error) {
            toast.error("Couldn't save settings", error instanceof ApiError ? error.message : undefined);
          }
        }}>Save settings</Button>
      </div>
    </div>
  );
}

function LocationsSection() {
  const locations = useLocations(false);
  const deactivate = useDeactivateLocation();
  const toast = useToast();
  const [editing, setEditing] = useState<WorkLocationResponse | "new" | null>(null);
  const [removing, setRemoving] = useState<WorkLocationResponse | null>(null);

  return (
    <Card>
      <CardHeader title="Work locations" description="Employees can clock in within the radius of any active location."
        action={<Button size="sm" onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> Add location</Button>} />
      <QueryBoundary isLoading={locations.isLoading} error={locations.error} data={locations.data} onRetry={() => locations.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyState={<EmptyState icon={<MapPin aria-hidden className="size-5" />} title="No work locations yet" description="Add your office so employees can clock in." action={<Button size="sm" onClick={() => setEditing("new")}>Add location</Button>} />}>
        {(data) => (
          <ul className="divide-y divide-slate-100">
            {data.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{l.name} {!l.isActive && <Badge className="ml-1">Inactive</Badge>}</p>
                  <p className="text-xs text-slate-500">{l.address ?? `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}`} · {l.radiusMeters} m radius</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(l)}><Pencil aria-hidden className="size-4" /> Edit</Button>
                  {l.isActive && <Button size="sm" variant="ghost" onClick={() => setRemoving(l)}>Deactivate</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      {editing && <LocationDialog location={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} loading={deactivate.isPending}
        title={`Deactivate ${removing?.name}?`} message="Employees won't be able to clock in here. Past attendance keeps its location." confirmLabel="Deactivate"
        onConfirm={async () => {
          if (!removing) return;
          try { await deactivate.mutateAsync(removing.id); toast.success("Location deactivated"); } catch (error) {
            toast.error("Couldn't deactivate", error instanceof ApiError ? error.message : undefined);
          }
          setRemoving(null);
        }} />
    </Card>
  );
}

function LocationDialog({ location, onClose }: { location: WorkLocationResponse | null; onClose: () => void }) {
  const save = useSaveLocation();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: location?.name ?? "", address: location?.address ?? "",
      latitude: location ? String(location.latitude) : "", longitude: location ? String(location.longitude) : "",
      radiusMeters: String(location?.radiusMeters ?? 100), isActive: location?.isActive ?? true,
    },
  });

  return (
    <Dialog open onClose={onClose} title={location ? `Edit ${location.name}` : "Add a work location"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="location-form" loading={save.isPending}>Save</Button></>}>
      <form id="location-form" noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          await save.mutateAsync({ id: location?.id, body: { name: v.name, address: v.address || null, latitude: Number(v.latitude), longitude: Number(v.longitude), radiusMeters: Number(v.radiusMeters), isActive: v.isActive } });
          toast.success("Location saved");
          onClose();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Couldn't save the location.");
        }
      })}>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Name" required error={errors.name?.message} {...register("name", { required: "Name this location." })} />
        <Input label="Address" {...register("address")} />
        <Button type="button" variant="secondary" loading={locating} onClick={async () => {
          setLocating(true);
          try {
            const p = await requestLocation();
            setValue("latitude", p.latitude.toFixed(6), { shouldDirty: true });
            setValue("longitude", p.longitude.toFixed(6), { shouldDirty: true });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't read your location.");
          } finally { setLocating(false); }
        }}><LocateFixed aria-hidden className="size-4" /> Use my current location</Button>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Latitude" inputMode="decimal" required error={errors.latitude?.message}
            {...register("latitude", { validate: (v) => (v !== "" && Math.abs(Number(v)) <= 90) || "Between -90 and 90." })} />
          <Input label="Longitude" inputMode="decimal" required error={errors.longitude?.message}
            {...register("longitude", { validate: (v) => (v !== "" && Math.abs(Number(v)) <= 180) || "Between -180 and 180." })} />
          <Input label="Radius (m)" type="number" min={20} max={20000} required error={errors.radiusMeters?.message}
            {...register("radiusMeters", { validate: (v) => (Number(v) >= 20 && Number(v) <= 20000) || "Between 20 and 20,000." })} />
        </div>
        <Checkbox label="Active" {...register("isActive")} />
      </form>
    </Dialog>
  );
}

function LeaveTypesSection() {
  const types = useLeaveTypes(false);
  const [editing, setEditing] = useState<LeaveTypeResponse | "new" | null>(null);

  return (
    <Card>
      <CardHeader title="Leave types" description="Default allowances apply to each employee per year; adjust individuals from their profile."
        action={<Button size="sm" onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> Add type</Button>} />
      <QueryBoundary isLoading={types.isLoading} error={types.error} data={types.data} onRetry={() => types.refetch()}>
        {(data) => (
          <ul className="divide-y divide-slate-100">
            {data.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{t.name} {!t.isActive && <Badge className="ml-1">Inactive</Badge>}</p>
                  <p className="text-xs text-slate-500">{t.defaultAnnualDays} days a year · {t.enforceBalance ? "Balance enforced" : "No balance limit"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>Edit</Button>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      {editing && <LeaveTypeDialog type={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function LeaveTypeDialog({ type, onClose }: { type: LeaveTypeResponse | null; onClose: () => void }) {
  const save = useSaveLeaveType();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: type?.name ?? "", code: type?.code ?? "", defaultAnnualDays: String(type?.defaultAnnualDays ?? 0), enforceBalance: type?.enforceBalance ?? true, isActive: type?.isActive ?? true },
  });

  return (
    <Dialog open onClose={onClose} title={type ? `Edit ${type.name}` : "Add a leave type"} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="leave-type-form" loading={save.isPending}>Save</Button></>}>
      <form id="leave-type-form" noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        setError(null);
        try {
          await save.mutateAsync({ id: type?.id, body: { name: v.name, code: v.code, defaultAnnualDays: Number(v.defaultAnnualDays), enforceBalance: v.enforceBalance, requiresApproval: true, isActive: v.isActive } });
          toast.success("Leave type saved");
          onClose();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Couldn't save.");
        }
      })}>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Name" required error={errors.name?.message} {...register("name", { required: "Enter a name." })} />
        <Input label="Code" required hint="Short identifier, e.g. study" error={errors.code?.message}
          {...register("code", { required: "Enter a code.", pattern: { value: /^[a-zA-Z0-9_-]+$/, message: "Letters, numbers, hyphens or underscores." } })} />
        <Input label="Days per year" type="number" min={0} max={400} {...register("defaultAnnualDays")} />
        <Checkbox label="Enforce balance" {...register("enforceBalance")} />
        <Checkbox label="Active" {...register("isActive")} />
      </form>
    </Dialog>
  );
}

function RolesSection() {
  const { me } = useSession();
  const roles = useRoles();
  const members = useMembers();
  const changeRole = useChangeMemberRole();
  const toast = useToast();
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);

  const scopeLabel = { [AccessScope.Organization]: "Whole company", [AccessScope.Department]: "Their departments", [AccessScope.Self]: "Only themselves" };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Roles" description="What each role can do, and whose records it reaches." />
        <QueryBoundary isLoading={roles.isLoading} error={roles.error} data={roles.data} onRetry={() => roles.refetch()}>
          {(data) => (
            <ul className="divide-y divide-slate-100">
              {data.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">{scopeLabel[r.scope]} · {r.permissions.length} permissions · {r.memberCount} members</p>
                  </div>
                  {r.key !== RoleKey.owner && <Button size="sm" variant="secondary" onClick={() => setEditingRole(r)}>Permissions</Button>}
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </Card>

      <Card>
        <CardHeader title="Members" description="People with a Workeva account in this company." />
        <QueryBoundary isLoading={members.isLoading} error={members.error} data={members.data} onRetry={() => members.refetch()}>
          {(data) => (
            <ul className="divide-y divide-slate-100">
              {data.map((m) => (
                <li key={m.membershipId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{m.fullName ?? m.email}</p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                  {m.userId === me?.userId ? (
                    <Badge>{m.roleName} (you)</Badge>
                  ) : (
                    <div className="sm:w-48">
                      <label htmlFor={`role-${m.membershipId}`} className="sr-only">Role for {m.email}</label>
                      <select id={`role-${m.membershipId}`} value={m.roleId} disabled={changeRole.isPending}
                        onChange={async (e) => {
                          try {
                            await changeRole.mutateAsync({ membershipId: m.membershipId, roleId: e.target.value });
                            toast.success("Role updated");
                          } catch (error) {
                            toast.error("Couldn't change role", error instanceof ApiError ? error.message : undefined);
                          }
                        }}
                        className="block h-9 w-full rounded-md border-0 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600">
                        {(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </Card>

      {editingRole && <RolePermissionsDialog role={editingRole} onClose={() => setEditingRole(null)} />}
    </div>
  );
}

function RolePermissionsDialog({ role, onClose }: { role: RoleResponse; onClose: () => void }) {
  const update = useUpdateRolePermissions();
  const toast = useToast();
  const [selected, setSelected] = useState(() => new Set(role.permissions));

  return (
    <Dialog open onClose={onClose} title={`${role.name} permissions`} description="Changes apply to everyone with this role on their next request." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={update.isPending} onClick={async () => {
        try {
          await update.mutateAsync({ roleId: role.id, permissions: [...selected] });
          toast.success("Permissions updated");
          onClose();
        } catch (error) {
          toast.error("Couldn't update permissions", error instanceof ApiError ? error.message : undefined);
        }
      }}>Save permissions</Button></>}>
      <div className="grid gap-5 sm:grid-cols-2">
        {permissionGroups.map((group) => (
          <fieldset key={group.label} className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">{group.label}</legend>
            {group.permissions.map((p) => (
              <Checkbox key={p} label={permissionLabels[p] ?? p} checked={selected.has(p)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(p); else next.delete(p);
                  setSelected(next);
                }} />
            ))}
          </fieldset>
        ))}
      </div>
    </Dialog>
  );
}
