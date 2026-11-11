"use client";

import { useState } from "react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  AlertCard,
  IntelligenceNotEnabled,
  NothingDetected,
} from "@/components/features/intelligence";
import { useSession } from "@/components/session-provider";
import { Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/data-table";
import { CardSkeleton, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useAcknowledgeAlert, useAlerts, useResolveAlert } from "@/hooks/use-intelligence";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import {
  AlertCategory,
  AlertResponse,
  AlertStatus,
  IntelligenceSeverity,
  alertCategoryLabels,
  alertStatusLabels,
  severityLabels,
} from "@/lib/types";

/**
 * The alerts page.
 *
 * Ordered by severity and then recency, which is the order somebody triaging would choose: a
 * critical alert from yesterday belongs above a low one from this morning.
 *
 * Open is the default filter, because the page's job is "what needs attention now" and a list
 * that opened on every alert ever raised would be a log. Resolved alerts remain reachable,
 * because they are the record of what was dealt with.
 */
export default function AlertsPage() {
  const { can } = useSession();
  const toast = useToast();

  const [status, setStatus] = useState<string>(String(AlertStatus.Open));
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [page, setPage] = useState(1);

  const alerts = useAlerts({
    status: status === "" ? undefined : (Number(status) as AlertStatus),
    category: category === "" ? undefined : (Number(category) as AlertCategory),
    minimumSeverity:
      severity === "" ? undefined : (Number(severity) as IntelligenceSeverity),
    page,
    pageSize: 20,
  });

  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();

  const canManage = can(Permission.intelligenceAlertManage);

  if (!can(Permission.intelligenceView)) return <NoAccess />;

  if (alerts.error instanceof ApiError && alerts.error.status === 404) {
    return (
      <>
        <PageHeader title="Alerts" description="Situations that need attention." />
        <IntelligenceNotEnabled />
      </>
    );
  }

  const act = async (
    action: typeof acknowledge | typeof resolve,
    alert: AlertResponse,
    done: string,
  ) => {
    try {
      await action.mutateAsync({ id: alert.id });
      toast.success(done);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update that alert.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Detected from your organization's own figures, most severe first."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Status"
              containerClassName="w-40"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {[AlertStatus.Open, AlertStatus.Acknowledged, AlertStatus.Resolved].map((value) => (
                <option key={value} value={value}>
                  {alertStatusLabels[value]}
                </option>
              ))}
            </Select>

            <Select
              label="Category"
              containerClassName="w-40"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {Object.entries(alertCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              label="At least"
              containerClassName="w-40"
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Any severity</option>
              {[
                IntelligenceSeverity.Low,
                IntelligenceSeverity.Medium,
                IntelligenceSeverity.High,
                IntelligenceSeverity.Critical,
              ].map((value) => (
                <option key={value} value={value}>
                  {severityLabels[value]}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <QueryBoundary
        isLoading={alerts.isLoading}
        error={alerts.error}
        data={alerts.data}
        onRetry={() => alerts.refetch()}
        loadingFallback={
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        emptyState={
          <NothingDetected
            title={
              status === String(AlertStatus.Open)
                ? "Nothing needs attention"
                : "No alerts match those filters"
            }
            description={
              status === String(AlertStatus.Open)
                ? "No open alerts. The dashboard shows when the detection sweep last ran, in case that seems surprising."
                : "Try widening the filters."
            }
          />
        }
      >
        {(data) => (
          <div className="space-y-3">
            {data.items.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                canManage={canManage}
                busy={acknowledge.isPending || resolve.isPending}
                onAcknowledge={(target) =>
                  void act(acknowledge, target, "Acknowledged. It's yours now.")
                }
                onResolve={(target) => void act(resolve, target, "Resolved.")}
              />
            ))}

            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
