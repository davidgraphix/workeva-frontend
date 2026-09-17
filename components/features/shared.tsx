"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CalendarDays, Check, ClipboardList, Clock, X } from "lucide-react";

import {
  useCancelLeave,
  useCreateLeaveRequest,
  useDecideLeave,
  useDepartments,
  useEmployees,
  useLeaveTypes,
  useSaveTask,
  useUpdateTaskStatus,
} from "@/hooks/use-workeva";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Avatar } from "@/components/ui/surfaces";
import { EmptyState } from "@/components/ui/states";
import { AttendanceStatusBadge, LeaveStatusBadge, OverdueBadge, TaskPriorityBadge, TaskStatusBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { formatAgo, formatDays, formatPlainDate, formatTime, todayIso } from "@/lib/format";
import {
  AttendanceEventType,
  LeaveStatus,
  TaskPriority,
  TaskStatus,
  taskPriorityLabels,
  taskStatusLabels,
  type AttendanceActivityItem,
  type LeaveRequestResponse,
  type TaskResponse,
} from "@/lib/types";

/** Maps API field errors onto react-hook-form, so a server rejection highlights the right field. */
function applyFieldErrors(
  error: unknown,
  setError: (field: never, value: { message: string }) => void,
): string {
  if (error instanceof ApiError) {
    for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
      setError(field as never, { message: messages[0] ?? "Invalid value." });
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

// ---------- Attendance activity ----------

export function ActivityFeed({ items, timezone }: { items: AttendanceActivityItem[]; timezone?: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Clock aria-hidden className="size-5" />}
        title="No attendance activity yet today"
        description="Clock-ins and clock-outs will appear here as they happen."
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, index) => (
        <li key={`${item.employeeId}-${item.occurredAt}-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Avatar name={item.employeeName} src={item.photoUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-900">
              <span className="font-medium">{item.employeeName}</span>{" "}
              {item.eventType === AttendanceEventType.ClockIn ? "checked in" : "checked out"}
              {" at "}
              <span className="numeric">{formatTime(item.occurredAt, timezone)}</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              {[item.departmentName, item.locationName].filter(Boolean).join(" · ") || formatAgo(item.occurredAt)}
            </p>
          </div>
          <AttendanceStatusBadge status={item.status} />
        </li>
      ))}
    </ul>
  );
}

// ---------- Leave approvals ----------

export function LeaveApprovalList({ requests, emptyText }: { requests: LeaveRequestResponse[]; emptyText?: string }) {
  const decide = useDecideLeave();
  const toast = useToast();
  const { can } = useSession();
  const [rejecting, setRejecting] = useState<LeaveRequestResponse | null>(null);
  const [note, setNote] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays aria-hidden className="size-5" />}
        title="Nothing waiting for approval"
        description={emptyText ?? "New leave requests from your team will appear here."}
      />
    );
  }

  async function approve(request: LeaveRequestResponse) {
    setPendingId(request.id);
    try {
      await decide.mutateAsync({ id: request.id, decision: "approve" });
      toast.success("Leave approved", `${request.employeeName} has been notified.`);
    } catch (error) {
      toast.error("Couldn't approve", error instanceof ApiError ? error.message : undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function reject() {
    if (!rejecting) return;
    try {
      await decide.mutateAsync({ id: rejecting.id, decision: "reject", note: note.trim() || undefined });
      toast.success("Leave declined", `${rejecting.employeeName} has been notified.`);
      setRejecting(null);
      setNote("");
    } catch (error) {
      toast.error("Couldn't decline", error instanceof ApiError ? error.message : undefined);
    }
  }

  const canApprove = can(Permission.leaveApprove);

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{request.employeeName}</p>
              <p className="text-xs text-slate-500">
                {request.leaveTypeName} · {formatPlainDate(request.startDate)} – {formatPlainDate(request.endDate)} ·{" "}
                {formatDays(request.daysCount)}
              </p>
              {request.reason && <p className="mt-1 line-clamp-2 text-xs text-slate-600">“{request.reason}”</p>}
            </div>
            {canApprove && request.status === LeaveStatus.Pending ? (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setRejecting(request)} disabled={pendingId === request.id}>
                  <X aria-hidden className="size-4" /> Decline
                </Button>
                <Button size="sm" variant="success" onClick={() => approve(request)} loading={pendingId === request.id}>
                  <Check aria-hidden className="size-4" /> Approve
                </Button>
              </div>
            ) : (
              <LeaveStatusBadge status={request.status} />
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Decline leave request"
        description={rejecting ? `${rejecting.employeeName} · ${rejecting.leaveTypeName}, ${formatDays(rejecting.daysCount)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={decide.isPending}>Cancel</Button>
            <Button variant="danger" onClick={reject} loading={decide.isPending}>Decline request</Button>
          </>
        }
      >
        <Textarea
          label="Reason (optional)"
          hint="Shared with the employee, so they understand the decision."
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </Dialog>
    </>
  );
}

// ---------- Leave request form ----------

export function LeaveRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const types = useLeaveTypes(true);
  const create = useCreateLeaveRequest();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm({
    defaultValues: { leaveTypeId: "", startDate: todayIso(), endDate: todayIso(), reason: "" },
  });

  const start = watch("startDate");

  const close = () => {
    setFormError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Request leave"
      description="Your manager will be notified. Weekends and non-working days aren't counted."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" form="leave-request-form" loading={create.isPending}>Submit request</Button>
        </>
      }
    >
      <form
        id="leave-request-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await create.mutateAsync(values);
            toast.success("Leave requested", "We'll let you know when it's been reviewed.");
            reset({ leaveTypeId: "", startDate: todayIso(), endDate: todayIso(), reason: "" });
            onClose();
          } catch (error) {
            // Form values stay in place so nothing has to be typed again.
            setFormError(applyFieldErrors(error, setError as never));
          }
        })}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Select label="Leave type" required error={errors.leaveTypeId?.message}
          {...register("leaveTypeId", { required: "Choose a leave type." })}>
          <option value="">Choose a leave type</option>
          {(types.data ?? []).map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First day" type="date" required error={errors.startDate?.message}
            {...register("startDate", { required: "Choose a start date." })} />
          <Input label="Last day" type="date" required min={start} error={errors.endDate?.message}
            {...register("endDate", {
              required: "Choose an end date.",
              validate: (value, all) => value >= all.startDate || "The end date can't be before the start date.",
            })} />
        </div>

        <Textarea label="Reason" required rows={3} maxLength={1000} error={errors.reason?.message}
          {...register("reason", { required: "Tell your manager why you need this leave." })} />
      </form>
    </Dialog>
  );
}

export function CancelLeaveButton({ request }: { request: LeaveRequestResponse }) {
  const cancel = useCancelLeave();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  if (request.status !== LeaveStatus.Pending && request.status !== LeaveStatus.Approved) return null;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Cancel</Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Cancel this leave request?"
        message={`Your ${request.leaveTypeName.toLowerCase()} from ${formatPlainDate(request.startDate)} to ${formatPlainDate(request.endDate)} will be cancelled and the days returned to your balance.`}
        confirmLabel="Cancel leave"
        cancelLabel="Keep it"
        loading={cancel.isPending}
        onConfirm={async () => {
          try {
            await cancel.mutateAsync(request.id);
            toast.success("Leave cancelled");
            setConfirming(false);
          } catch (error) {
            toast.error("Couldn't cancel", error instanceof ApiError ? error.message : undefined);
          }
        }}
      />
    </>
  );
}

// ---------- Tasks ----------

export function TaskList({ tasks, showAssignee = false, onEdit }: {
  tasks: TaskResponse[];
  showAssignee?: boolean;
  onEdit?: (task: TaskResponse) => void;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList aria-hidden className="size-5" />}
        title="No tasks here"
        description="Tasks assigned to you will show up in this list."
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showAssignee={showAssignee} onEdit={onEdit} />
      ))}
    </ul>
  );
}

function TaskRow({ task, showAssignee, onEdit }: { task: TaskResponse; showAssignee: boolean; onEdit?: (task: TaskResponse) => void }) {
  const update = useUpdateTaskStatus();
  const toast = useToast();
  const { me } = useSession();

  const isMine = task.assigneeEmployeeId === me?.active?.employeeId;
  const nextStatus =
    task.status === TaskStatus.ToDo ? TaskStatus.InProgress : task.status === TaskStatus.InProgress ? TaskStatus.Completed : null;

  async function advance() {
    if (nextStatus === null) return;
    try {
      await update.mutateAsync({ id: task.id, status: nextStatus });
      toast.success(nextStatus === TaskStatus.Completed ? "Task completed" : "Task started");
    } catch (error) {
      toast.error("Couldn't update the task", error instanceof ApiError ? error.message : undefined);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {onEdit ? (
            <button type="button" onClick={() => onEdit(task)} className="text-left text-sm font-medium text-slate-900 hover:text-brand-700">
              {task.title}
            </button>
          ) : (
            <p className="text-sm font-medium text-slate-900">{task.title}</p>
          )}
          <TaskPriorityBadge priority={task.priority} />
          {task.isOverdue && <OverdueBadge />}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {[
            showAssignee ? task.assigneeName ?? "Unassigned" : null,
            task.dueDate ? `Due ${formatPlainDate(task.dueDate)}` : "No due date",
            task.departmentName,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <TaskStatusBadge status={task.status} />
        {isMine && nextStatus !== null && (
          <Button size="sm" variant="secondary" onClick={advance} loading={update.isPending}>
            {nextStatus === TaskStatus.InProgress ? "Start" : "Mark done"}
          </Button>
        )}
      </div>
    </li>
  );
}

export function TaskDialog({ open, onClose, task }: { open: boolean; onClose: () => void; task?: TaskResponse | null }) {
  const save = useSaveTask();
  const update = useUpdateTaskStatus();
  const toast = useToast();
  const { can, me } = useSession();
  const canAssign = can(Permission.taskAssign);
  const employees = useEmployees({ pageSize: 100, status: 0 });
  const departments = useDepartments();
  const [formError, setFormError] = useState<string | null>(null);

  const selfId = me?.active?.employeeId ?? "";

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    values: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeEmployeeId: task?.assigneeEmployeeId ?? (canAssign ? "" : selfId),
      departmentId: task?.departmentId ?? "",
      priority: String(task?.priority ?? TaskPriority.Medium),
      dueDate: task?.dueDate ?? "",
      status: String(task?.status ?? TaskStatus.ToDo),
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="task-form" loading={save.isPending || update.isPending}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form
        id="task-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await save.mutateAsync({
              id: task?.id,
              body: {
                title: values.title,
                description: values.description || null,
                assigneeEmployeeId: values.assigneeEmployeeId || null,
                departmentId: values.departmentId || null,
                priority: Number(values.priority),
                dueDate: values.dueDate || null,
              },
            });
            if (task && Number(values.status) !== task.status) {
              await update.mutateAsync({ id: task.id, status: Number(values.status) as TaskStatus });
            }
            toast.success(task ? "Task updated" : "Task created");
            onClose();
          } catch (error) {
            setFormError(applyFieldErrors(error, setError as never));
          }
        })}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Input label="Title" required maxLength={200} error={errors.title?.message}
          {...register("title", { required: "Give the task a title." })} />
        <Textarea label="Description" rows={3} maxLength={4000} {...register("description")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Assign to" disabled={!canAssign} error={errors.assigneeEmployeeId?.message}
            hint={canAssign ? undefined : "You can create tasks for yourself."} {...register("assigneeEmployeeId")}>
            {canAssign && <option value="">Unassigned</option>}
            {(employees.data?.items ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.fullName}</option>
            ))}
          </Select>
          <Select label="Department" {...register("departmentId")}>
            <option value="">None</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Priority" {...register("priority")}>
            {[TaskPriority.Low, TaskPriority.Medium, TaskPriority.High, TaskPriority.Urgent].map((p) => (
              <option key={p} value={p}>{taskPriorityLabels[p]}</option>
            ))}
          </Select>
          <Input label="Due date" type="date" {...register("dueDate")} />
          {task && (
            <Select label="Status" {...register("status")}>
              {[TaskStatus.ToDo, TaskStatus.InProgress, TaskStatus.Completed, TaskStatus.Cancelled].map((s) => (
                <option key={s} value={s}>{taskStatusLabels[s]}</option>
              ))}
            </Select>
          )}
        </div>
      </form>
    </Dialog>
  );
}
