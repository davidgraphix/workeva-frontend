"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { IntelligenceNotEnabled } from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { CardSkeleton, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useAlertRules, useAssistantStatus, useSaveAlertRule } from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import {
  AlertRuleSettingResponse,
  IntelligenceSeverity,
  severityLabels,
} from "@/lib/types";

/**
 * Intelligence settings.
 *
 * Each rule shows its default beside its override, so an administrator can see what the rule
 * would do before deciding to change it — rather than having to turn it on to find out. A rule
 * nobody has configured is on, with its default: the settings table exists to *change* a rule,
 * not to switch it on.
 *
 * The AI section reports whether a provider is configured and never which key, because a settings
 * page is something anybody can screenshot.
 */
export default function IntelligenceSettingsPage() {
  const { can } = useSession();
  const rules = useAlertRules();
  const status = useAssistantStatus();

  if (!can(Permission.intelligenceConfigure)) return <NoAccess />;

  if (rules.error instanceof ApiError && rules.error.status === 404) {
    return (
      <>
        <PageHeader title="Intelligence settings" description="Alert rules and AI configuration." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Intelligence settings"
        description="What Workeva watches for, and how loudly it says so."
      />

      <div className="space-y-5">
        {/* ---------- The assistant ---------- */}
        {status.data && (
          <Card>
            <CardHeader
              title="Ask Workeva"
              description="The conversational assistant, and what it is allowed to cost."
            />
            <CardBody className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">
                  {status.data.writtenByModel
                    ? "An AI service is configured."
                    : "No AI service is configured."}
                </span>{" "}
                {status.data.writtenByModel
                  ? "Answers are written by a model from figures this platform calculated."
                  : "Answers are written from a template. The figures are exactly the same; only the wording is plainer, and nothing else in Workeva is affected."}
              </p>

              <p>
                <span className="numeric font-medium text-slate-900">
                  {status.data.questionsUsedToday}
                </span>{" "}
                of <span className="numeric">{status.data.dailyQuestionLimit}</span> questions used
                today across the organization, with a limit of{" "}
                <span className="numeric">{status.data.questionsPerMinuteLimit}</span> per person
                per minute.
              </p>

              <p className="text-xs text-slate-500">
                The limits and the AI service are set by whoever deploys Workeva, in the server&apos;s
                configuration — not here, because a page that could raise a spending limit is a page
                that will.
              </p>
            </CardBody>
          </Card>
        )}

        {/* ---------- Alert rules ---------- */}
        <QueryBoundary
          isLoading={rules.isLoading}
          error={rules.error}
          data={rules.data}
          onRetry={() => rules.refetch()}
          loadingFallback={
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          }
        >
          {(data) => (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Alert rules</h2>
              {data.map((rule) => (
                <RuleRow key={rule.ruleKey} rule={rule} />
              ))}
            </div>
          )}
        </QueryBoundary>
      </div>
    </>
  );
}

/**
 * One rule's configuration.
 *
 * Local state, saved on demand rather than on every keystroke: a threshold typed as "1" on the
 * way to "15" should not fire a save that alerts on everybody.
 */
function RuleRow({ rule }: { rule: AlertRuleSettingResponse }) {
  const toast = useToast();
  const save = useSaveAlertRule();

  const [enabled, setEnabled] = useState(rule.isEnabled);
  const [threshold, setThreshold] = useState(rule.threshold?.toString() ?? "");
  const [windowDays, setWindowDays] = useState(rule.windowDays?.toString() ?? "");
  const [severity, setSeverity] = useState<IntelligenceSeverity>(rule.minimumSeverity);

  const dirty =
    enabled !== rule.isEnabled ||
    threshold !== (rule.threshold?.toString() ?? "") ||
    windowDays !== (rule.windowDays?.toString() ?? "") ||
    severity !== rule.minimumSeverity;

  const submit = async () => {
    try {
      await save.mutateAsync({
        ruleKey: rule.ruleKey,
        isEnabled: enabled,
        // Empty means "use the default", which is a different thing from zero.
        threshold: threshold.trim() === "" ? null : Number(threshold),
        windowDays: windowDays.trim() === "" ? null : Number(windowDays),
        minimumSeverity: severity,
      });

      toast.success(`${rule.title} updated.`);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not save that rule.",
      );
    }
  };

  const reset = () => {
    setEnabled(rule.isEnabled);
    setThreshold(rule.threshold?.toString() ?? "");
    setWindowDays(rule.windowDays?.toString() ?? "");
    setSeverity(rule.minimumSeverity);
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div>
          <Checkbox
            label={rule.title}
            description={rule.description}
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </div>

        {enabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Threshold"
              type="number"
              min={1}
              max={1000}
              inputMode="numeric"
              value={threshold}
              placeholder={String(rule.defaultThreshold)}
              hint={`Default ${rule.defaultThreshold}`}
              onChange={(event) => setThreshold(event.target.value)}
            />

            {rule.defaultWindowDays > 0 ? (
              <Input
                label="Window, in days"
                type="number"
                min={1}
                max={365}
                inputMode="numeric"
                value={windowDays}
                placeholder={String(rule.defaultWindowDays)}
                hint={`Default ${rule.defaultWindowDays}`}
                onChange={(event) => setWindowDays(event.target.value)}
              />
            ) : (
              <div className="hidden sm:block" />
            )}

            <Select
              label="Only tell me at"
              value={String(severity)}
              hint="Quieter rules are still detected, just not shown"
              onChange={(event) =>
                setSeverity(Number(event.target.value) as IntelligenceSeverity)
              }
            >
              {[
                IntelligenceSeverity.Information,
                IntelligenceSeverity.Low,
                IntelligenceSeverity.Medium,
                IntelligenceSeverity.High,
                IntelligenceSeverity.Critical,
              ].map((value) => (
                <option key={value} value={value}>
                  {severityLabels[value]} and above
                </option>
              ))}
            </Select>
          </div>
        )}

        {dirty && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void submit()} loading={save.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden className="size-3.5" />
              Discard
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
