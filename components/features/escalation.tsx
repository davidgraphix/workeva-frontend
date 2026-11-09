"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Alert, Badge, Card, CardHeader } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { RoleKey } from "@/lib/permissions";
import { EscalationTarget, escalationTargetLabels, type EscalationRuleResponse } from "@/lib/types";
import {
  useEscalationRules,
  useRemoveEscalationRule,
  useSaveEscalationRule,
} from "@/hooks/use-projects";

/**
 * The company's overdue-task escalation ladder, for the settings screen.
 *
 * A company that has configured nothing is shown the built-in default, marked as such, because
 * "what happens when I am late" should have an answer before anybody writes a rule. Adding the
 * first rule replaces that ladder entirely rather than adding to it, and the panel says so out
 * loud - it is the kind of behaviour that is obvious once known and surprising until then.
 */
export function EscalationSection() {
  const rules = useEscalationRules();
  const save = useSaveEscalationRule();
  const remove = useRemoveEscalationRule();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(1);
  const [target, setTarget] = useState<EscalationTarget>(EscalationTarget.Assignee);
  const [targetRoleKey, setTargetRoleKey] = useState<string>(RoleKey.hrAdmin);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // The whole project module is gated by a flag that answers 404, so a 404 here means the
  // feature is off for this organization rather than that something is broken.
  const notEnabled = rules.error instanceof ApiError && rules.error.status === 404;

  if (notEnabled) {
    return (
      <Card>
        <EmptyState
          title="Projects aren't switched on for your company"
          description="Overdue escalation is part of the projects feature. Enable it to configure who gets told when work slips."
        />
      </Card>
    );
  }

  const items = rules.data ?? [];
  const onDefault = items.length > 0 && items.every((rule) => rule.isDefault);

  const submit = async () => {
    try {
      await save.mutateAsync({
        body: {
          daysOverdue,
          target,
          targetRoleKey: target === EscalationTarget.Role ? targetRoleKey : null,
          isActive: true,
        },
      });

      toast.success("Rung added");
      setAdding(false);
    } catch (error) {
      toast.error("That didn't save", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const toggle = async (rule: EscalationRuleResponse) => {
    try {
      await save.mutateAsync({
        id: rule.id,
        body: {
          daysOverdue: rule.daysOverdue,
          target: rule.target,
          targetRoleKey: rule.targetRoleKey,
          isActive: !rule.isActive,
        },
      });
    } catch (error) {
      toast.error("That didn't save", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const confirmRemoval = async () => {
    if (!removingId) return;

    try {
      await remove.mutateAsync({ id: removingId });
      toast.success("Rung removed");
    } catch (error) {
      toast.error("That didn't work", error instanceof ApiError ? error.message : "Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Overdue escalation"
        description="Who gets told when a task passes its due date, and how long after."
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add a rung
          </Button>
        }
      />

      {onDefault && (
        <div className="px-4 pt-4">
          <Alert tone="info" title="You are on the default ladder">
            These are Workeva&apos;s defaults. Adding a rung of your own replaces this ladder
            entirely rather than adding to it, so set out every step you want.
          </Alert>
        </div>
      )}

      <QueryBoundary
        isLoading={rules.isLoading}
        error={rules.error}
        data={rules.data}
        onRetry={() => rules.refetch()}
        loadingFallback={
          <div className="p-4">
            <CardSkeleton />
          </div>
        }
        isEmpty={(d) => d.length === 0}
        emptyState={
          <EmptyState
            title="Escalation is switched off"
            description="No rungs are configured, so nobody is notified about overdue work. Add a rung to turn it back on."
          />
        }
      >
        {(data) => (
          <ol className="divide-y divide-slate-100">
            {/* Each rung wraps on a phone: the day, the target and the controls are three things
                that will not sit on one 375px line without truncating the part that matters. */}
            {data.map((rule, index) => (
              <li
                key={rule.isDefault ? `default-${index}` : rule.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap"
              >
                <span className="numeric w-16 shrink-0 text-sm font-medium text-slate-900">
                  Day {rule.daysOverdue}
                </span>

                <span className="min-w-0 flex-1 text-sm text-slate-700">
                  {escalationTargetLabels[rule.target]}
                  {rule.target === EscalationTarget.Role && rule.targetRoleKey
                    ? ` (${rule.targetRoleKey})`
                    : ""}
                </span>

                {rule.isDefault ? (
                  <Badge tone="neutral">Default</Badge>
                ) : (
                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <Checkbox label="Active" checked={rule.isActive} onChange={() => toggle(rule)} />
                    <button
                      type="button"
                      onClick={() => setRemovingId(rule.id)}
                      aria-label={`Remove the day ${rule.daysOverdue} rung`}
                      className="-m-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger-600"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </QueryBoundary>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add an escalation rung"
        description="Each rung fires once per task, the first time a sweep finds it that many days late."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={save.isPending}>
              Add rung
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Days past the due date"
            type="number"
            min={1}
            max={365}
            value={daysOverdue}
            onChange={(e) => setDaysOverdue(Number(e.target.value))}
            required
          />

          <Select
            label="Notify"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value) as EscalationTarget)}
          >
            {[
              EscalationTarget.Assignee,
              EscalationTarget.LineManager,
              EscalationTarget.ProjectManager,
              EscalationTarget.ProjectOwner,
              EscalationTarget.Role,
            ].map((t) => (
              <option key={t} value={t}>
                {escalationTargetLabels[t]}
              </option>
            ))}
          </Select>

          {target === EscalationTarget.Role && (
            <Select
              label="Which role"
              hint="Everybody holding this role is notified."
              value={targetRoleKey}
              onChange={(e) => setTargetRoleKey(e.target.value)}
            >
              <option value={RoleKey.hrAdmin}>HR / Admin</option>
              <option value={RoleKey.owner}>Company Owner</option>
              <option value={RoleKey.manager}>Manager</option>
            </Select>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={removingId !== null}
        onClose={() => setRemovingId(null)}
        onConfirm={confirmRemoval}
        title="Remove this rung?"
        message="Nobody will be notified at that point any more. Removing every rung switches escalation off."
        confirmLabel="Remove"
        loading={remove.isPending}
      />
    </Card>
  );
}
