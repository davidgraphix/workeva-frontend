"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { useToast } from "@/components/ui/toast";
import {
  useOperationActivities,
  useReviewOperationReport,
  useSubmitOperationReport,
} from "@/hooks/use-operations";
import { formatDate } from "@/lib/format";
import {
  OperationReportStatus,
  OperationShift,
  type MyOperationAssignmentResponse,
  type OperationReportResponse,
} from "@/lib/types";

export function ReportStatusBadge({ status }: { status: OperationReportStatus }) {
  if (status === OperationReportStatus.Approved) return <Badge tone="success">Approved</Badge>;
  if (status === OperationReportStatus.Returned) return <Badge tone="warning">Needs changes</Badge>;
  return <Badge tone="info">Awaiting review</Badge>;
}

export function shiftLabel(shift: OperationShift) {
  return shift === OperationShift.Morning ? "Morning" : "Evening";
}

interface ActivityLine {
  key: string;
  activityId: string;
  quantity: string;
  notes: string;
}

function newLine(): ActivityLine {
  return { key: crypto.randomUUID(), activityId: "", quantity: "", notes: "" };
}

/**
 * The field worker's form. Built for a phone held in one hand at the edge of a field:
 * large controls, one activity at a time, and the unit shown from the chosen activity so
 * nobody has to remember whether this crop is counted in kilograms or bags.
 */
export function SubmitReportDialog({
  open,
  onClose,
  assignment,
  shift,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  assignment: MyOperationAssignmentResponse;
  shift: OperationShift;
  existing?: OperationReportResponse | null;
}) {
  const toast = useToast();
  const submit = useSubmitOperationReport();
  const activities = useOperationActivities(assignment.operationLocationId, true);

  const [lines, setLines] = useState<ActivityLine[]>(() =>
    existing && existing.lines.length > 0
      ? existing.lines.map((line) => ({
          key: line.id,
          activityId: line.activityId,
          quantity: String(line.quantity),
          notes: line.notes ?? "",
        }))
      : [newLine()],
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const available = activities.data ?? [];

  const update = (key: string, patch: Partial<ActivityLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const unitFor = (activityId: string) => available.find((a) => a.id === activityId)?.unit ?? "";

  async function send() {
    setFormError(null);

    const filled = lines.filter((line) => line.activityId && line.quantity.trim().length > 0);
    if (filled.length === 0) {
      setFormError("Add at least one activity and how much was done.");
      return;
    }

    if (filled.some((line) => Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0)) {
      setFormError("Every quantity has to be a number greater than zero.");
      return;
    }

    if (new Set(filled.map((line) => line.activityId)).size !== filled.length) {
      setFormError("Each activity can only appear once.");
      return;
    }

    try {
      await submit.mutateAsync({
        operationLocationId: assignment.operationLocationId,
        reportDate: today,
        shift,
        lines: filled.map((line) => ({
          activityId: line.activityId,
          quantity: Number(line.quantity),
          notes: line.notes.trim() || null,
        })),
        notes: notes.trim() || null,
      });

      toast.success(existing ? "Report updated" : "Report submitted");
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't submit that report.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${shiftLabel(shift)} report`}
      description={`${assignment.operationLocationName} · ${formatDate(today)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} loading={submit.isPending}>
            {existing ? "Resubmit" : "Submit report"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {existing?.reviewNote && existing.status === OperationReportStatus.Returned && (
          <Alert tone="warning" title="Your supervisor asked for a change">
            {existing.reviewNote}
          </Alert>
        )}

        {formError && <Alert tone="danger" title="Check the report">{formError}</Alert>}

        {available.length === 0 && !activities.isLoading && (
          <Alert tone="info" title="No activities set up yet">
            Ask an administrator to add the kinds of work you report on.
          </Alert>
        )}

        {lines.map((line, index) => (
          <div key={line.key} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-600">Activity {index + 1}</p>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-danger-700"
                  aria-label={`Remove activity ${index + 1}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-2 space-y-3">
              <Select
                label="What was done"
                value={line.activityId}
                onChange={(e) => update(line.key, { activityId: e.target.value })}
              >
                <option value="">Choose an activity</option>
                {available.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} ({activity.unit})
                  </option>
                ))}
              </Select>

              <Input
                label={line.activityId ? `How much (${unitFor(line.activityId)})` : "How much"}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.001"
                value={line.quantity}
                onChange={(e) => update(line.key, { quantity: e.target.value })}
              />

              <Input
                label="Note (optional)"
                value={line.notes}
                onChange={(e) => update(line.key, { notes: e.target.value })}
              />
            </div>
          </div>
        ))}

        <Button variant="secondary" onClick={() => setLines((current) => [...current, newLine()])}>
          <Plus aria-hidden className="size-4" /> Add another activity
        </Button>

        <Textarea
          label="Anything else about this shift (optional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Dialog>
  );
}

/** One assigned location, with both shifts and what is still outstanding today. */
export function AssignmentCard({
  assignment,
  reports,
}: {
  assignment: MyOperationAssignmentResponse;
  reports: OperationReportResponse[];
}) {
  const [open, setOpen] = useState<OperationShift | null>(null);

  const reportFor = (shift: OperationShift) =>
    reports.find(
      (r) =>
        r.operationLocationId === assignment.operationLocationId &&
        r.shift === shift &&
        r.reportDate === new Date().toISOString().slice(0, 10),
    ) ?? null;

  const shifts: { shift: OperationShift; submitted: boolean; status: OperationReportStatus | null }[] = [
    { shift: OperationShift.Morning, submitted: assignment.morningSubmitted, status: assignment.morningStatus },
    { shift: OperationShift.Evening, submitted: assignment.eveningSubmitted, status: assignment.eveningStatus },
  ];

  return (
    <Card>
      <CardHeader
        title={assignment.operationLocationName}
        description={assignment.address ?? undefined}
      />
      <CardBody className="space-y-3">
        {shifts.map(({ shift, submitted, status }) => {
          const existing = reportFor(shift);
          const needsChanges = status === OperationReportStatus.Returned;

          return (
            <div key={shift} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                {submitted && !needsChanges ? (
                  <CheckCircle2 aria-hidden className="size-5 text-success-700" />
                ) : (
                  <Clock aria-hidden className="size-5 text-slate-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">{shiftLabel(shift)}</p>
                  <p className="text-xs text-slate-600">
                    {submitted ? (needsChanges ? "Returned for changes" : "Submitted") : "Not reported yet"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status !== null && <ReportStatusBadge status={status} />}
                {(!submitted || needsChanges) && (
                  <Button size="sm" onClick={() => setOpen(shift)} className="min-h-11">
                    {needsChanges ? "Correct report" : "Report"}
                  </Button>
                )}
              </div>

              {open === shift && (
                <SubmitReportDialog
                  open
                  onClose={() => setOpen(null)}
                  assignment={assignment}
                  shift={shift}
                  existing={needsChanges ? existing : null}
                />
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

/** A report, in full, with the review controls when the reader is allowed to use them. */
export function ReportDetail({ report, onReviewed }: { report: OperationReportResponse; onReviewed?: () => void }) {
  const toast = useToast();
  const review = useReviewOperationReport();
  const [note, setNote] = useState("");
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setError(null);

    if (!approve && note.trim().length === 0) {
      setReturning(true);
      setError("Say what needs correcting before returning it.");
      return;
    }

    try {
      await review.mutateAsync({ id: report.id, approve, note: note.trim() || null });
      toast.success(approve ? "Report approved" : "Report returned for changes");
      setNote("");
      setReturning(false);
      onReviewed?.();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "We couldn't record that decision.");
    }
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-600">Location</dt>
          <dd className="font-medium text-slate-900">{report.operationLocationName}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Reported by</dt>
          <dd className="font-medium text-slate-900">{report.employeeName}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Date</dt>
          <dd className="font-medium text-slate-900">{formatDate(report.reportDate)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Shift</dt>
          <dd className="font-medium text-slate-900">{shiftLabel(report.shift)}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Work reported</h3>
        <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
          {report.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{line.activityName}</p>
                {line.notes && <p className="text-xs text-slate-600">{line.notes}</p>}
              </div>
              <p className="numeric text-sm font-semibold text-slate-900">
                {line.quantity} <span className="font-normal text-slate-600">{line.unit}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      {report.notes && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Shift notes</h3>
          <p className="mt-1 text-sm text-slate-700">{report.notes}</p>
        </div>
      )}

      {report.reviewedByName && (
        <Alert tone={report.status === OperationReportStatus.Approved ? "success" : "warning"}
               title={`${report.status === OperationReportStatus.Approved ? "Approved" : "Returned"} by ${report.reviewedByName}`}>
          {report.reviewNote ?? "No note was left."}
        </Alert>
      )}

      {report.canReview && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Review</h3>
          {error && <Alert tone="danger" title="Check the review">{error}</Alert>}

          {returning && (
            <Textarea
              label="What needs correcting"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={() => decide(true)} loading={review.isPending}>
              Approve
            </Button>
            <Button variant="secondary" onClick={() => (returning ? decide(false) : setReturning(true))}>
              {returning ? "Send back" : "Return for changes"}
            </Button>
          </div>
        </div>
      )}

      {!report.canReview && !report.reviewedByName && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <ClipboardList aria-hidden className="size-4" /> Waiting for a supervisor to review this.
        </p>
      )}
    </div>
  );
}
