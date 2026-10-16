"use client";

import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card, CardBody } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useOperationActivities,
  useOperationLocations,
  useSaveOperationActivity,
  type SaveActivityBody,
} from "@/hooks/use-operations";
import { Permission } from "@/lib/permissions";
import type { OperationActivityResponse } from "@/lib/types";

/** Units people actually use in the field; the field stays free text for anything else. */
const UNIT_SUGGESTIONS = ["kg", "tonnes", "bags", "crates", "litres", "hours", "trips", "units", "hectares", "rows"];

function ActivityDialog({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity?: OperationActivityResponse | null;
}) {
  const toast = useToast();
  const save = useSaveOperationActivity();
  const locations = useOperationLocations({ onlyActive: true, pageSize: 100 });

  const [form, setForm] = useState<SaveActivityBody>(() => ({
    name: activity?.name ?? "",
    description: activity?.description ?? null,
    unit: activity?.unit ?? "kg",
    operationLocationId: activity?.operationLocationId ?? null,
    isActive: activity?.isActive ?? true,
  }));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SaveActivityBody>(key: K, value: SaveActivityBody[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setError(null);

    if (form.name.trim().length === 0) {
      setError("Name the activity, for example Harvesting.");
      return;
    }

    if (form.unit.trim().length === 0) {
      setError("Say how this activity is counted.");
      return;
    }

    try {
      await save.mutateAsync({
        id: activity?.id,
        body: { ...form, name: form.name.trim(), unit: form.unit.trim() },
      });
      toast.success(activity ? "Activity updated" : "Activity added");
      onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "We couldn't save that activity.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={activity ? "Edit activity" : "Add an activity"}
      description="The kinds of work your field staff report, and how each one is counted."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending}>{activity ? "Save changes" : "Add activity"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger" title="Check the details">{error}</Alert>}

        <Input label="Name" placeholder="Harvesting" value={form.name} onChange={(e) => set("name", e.target.value)} required />

        <div>
          <Input
            label="Counted in"
            placeholder="kg"
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            hint="Shown next to the quantity when somebody reports this work."
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {UNIT_SUGGESTIONS.map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => set("unit", unit)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        <Select
          label="Applies to"
          value={form.operationLocationId ?? ""}
          onChange={(e) => set("operationLocationId", e.target.value || null)}
        >
          <option value="">Every location</option>
          {(locations.data?.items ?? []).map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </Select>

        <Textarea
          label="Description (optional)"
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
        />

        <Checkbox
          label="Active"
          description="Inactive activities cannot be chosen on new reports, and stay on old ones."
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
        />
      </div>
    </Dialog>
  );
}

export default function OperationActivitiesPage() {
  const { can } = useSession();
  const activities = useOperationActivities(undefined, false);
  const [editing, setEditing] = useState<OperationActivityResponse | "new" | null>(null);

  if (!can(Permission.operationsView)) return <NoAccess />;

  const canManage = can(Permission.operationsActivityManage);

  return (
    <>
      <PageHeader
        title="Activities"
        description="What your field staff can report, and the unit each is measured in."
        actions={
          canManage ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" /> Add activity
            </Button>
          ) : undefined
        }
      />

      <QueryBoundary
        isLoading={activities.isLoading}
        error={activities.error}
        data={activities.data}
        onRetry={() => activities.refetch()}
        loadingFallback={<CardSkeleton />}
      >
        {(data) =>
          data.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<ListChecks aria-hidden className="size-6 text-slate-500" />}
                  title="No activities yet"
                  description={
                    canManage
                      ? "Add the kinds of work your staff report - planting, harvesting, irrigation, loading."
                      : "An administrator has not configured any activities yet."
                  }
                  action={canManage ? <Button onClick={() => setEditing("new")}>Add activity</Button> : undefined}
                />
              </CardBody>
            </Card>
          ) : (
            <ul className="space-y-3">
              {data.map((activity) => (
                <li key={activity.id}>
                  <Card>
                    <CardBody className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{activity.name}</p>
                          <Badge tone="neutral">{activity.unit}</Badge>
                          {!activity.isActive && <Badge tone="neutral">Inactive</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {activity.operationLocationName ? `Only at ${activity.operationLocationName}` : "Every location"}
                          {activity.description ? ` · ${activity.description}` : ""}
                        </p>
                      </div>

                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(activity)}>Edit</Button>
                      )}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>

      {editing && (
        <ActivityDialog
          open
          onClose={() => setEditing(null)}
          activity={editing === "new" ? null : editing}
        />
      )}
    </>
  );
}
