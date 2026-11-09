"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  FolderKanban,
  Link2,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Avatar, Badge, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import {
  AtRiskBadge,
  BlockedBadge,
  OverdueBadge,
  ProgressBar,
  ProjectMemberRoleBadge,
  ProjectStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/session-provider";
import { ApiError } from "@/lib/api";
import { formatAgo, formatPlainDate, initials } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import {
  ProjectMemberRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  projectActivityLabels,
  projectMemberRoleLabels,
  projectStatusLabels,
  taskPriorityLabels,
  type ProjectActivityResponse,
  type ProjectResponse,
  type TaskResponse,
} from "@/lib/types";
import { useDepartments, useEmployees } from "@/hooks/use-workeva";
import {
  useAddChecklistItem,
  useAddProjectMember,
  useAddTaskComment,
  useAddTaskDependency,
  useProjectMembers,
  useRemoveChecklistItem,
  useRemoveProjectMember,
  useRemoveTaskComment,
  useRemoveTaskDependency,
  useSaveProject,
  useSetChecklistItemDone,
  useTaskAttachmentDownload,
  useTaskAttachments,
  useTaskChecklist,
  useTaskComments,
  useTaskDependencies,
  useUploadTaskAttachment,
  type SaveProjectBody,
} from "@/hooks/use-projects";

/**
 * The project module's own components.
 *
 * Each one takes data rather than fetching it where a parent already has it, so a list of twelve
 * project cards does not issue twelve queries. Where a panel is genuinely independent - a task's
 * comments, its checklist - it fetches its own, because it is opened on demand.
 */

// ---------- A project card ----------

export function ProjectCard({ project }: { project: ProjectResponse }) {
  const tone = project.isOverdue ? "danger" : project.isAtRisk ? "warning" : "info";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-[--radius-card] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {project.code ? `${project.code} · ` : ""}
            {project.departmentName ?? project.teamName ?? project.branchName ?? "No department"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ProjectStatusBadge status={project.status} />
          {project.isOverdue ? <OverdueBadge /> : project.isAtRisk ? <AtRiskBadge /> : null}
        </div>
      </div>

      <ProgressBar className="mt-3" value={project.progressPercent} tone={tone} />

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Tasks</dt>
          <dd className="numeric font-medium text-slate-900">
            {project.completedTaskCount}/{project.taskCount}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Overdue</dt>
          <dd
            className={`numeric font-medium ${project.overdueTaskCount > 0 ? "text-danger-700" : "text-slate-900"}`}
          >
            {project.overdueTaskCount}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Due</dt>
          <dd className="font-medium text-slate-900">
            {project.dueDate ? formatPlainDate(project.dueDate) : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Avatar name={project.ownerName} src={project.ownerPhotoUrl} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{project.ownerName}</span>
        <TaskPriorityBadge priority={project.priority} />
      </div>
    </Link>
  );
}

// ---------- Create and edit ----------

/**
 * The project form.
 *
 * Validation here is for immediacy only - the API checks every one of these again, including the
 * things a browser cannot know, such as whether the chosen team belongs to the chosen
 * department. A field error from the server is shown against its own field.
 */
export function ProjectDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectResponse | null;
}) {
  // Keyed on what the form is editing, so opening the dialog on a different project remounts it
  // with that project's values. The alternative - an effect that resets state when `open` turns
  // true - writes state during render and causes a cascading render for no benefit; React's own
  // answer to "reset this form when its subject changes" is a key.
  return (
    <ProjectForm
      key={`${project?.id ?? "new"}:${open}`}
      open={open}
      onClose={onClose}
      project={project}
    />
  );
}

function ProjectForm({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectResponse | null;
}) {
  const { me } = useSession();
  const save = useSaveProject();
  const toast = useToast();
  const departments = useDepartments();
  const employees = useEmployees({ pageSize: 100 });

  const ownEmployeeId = me?.active?.employeeId ?? "";

  const [form, setForm] = useState<SaveProjectBody>(() =>
    project
      ? {
          name: project.name,
          code: project.code,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.startDate,
          dueDate: project.dueDate,
          ownerEmployeeId: project.ownerEmployeeId,
          managerEmployeeId: project.managerEmployeeId,
          departmentId: project.departmentId,
          branchId: project.branchId,
          teamId: project.teamId,
        }
      : blank(ownEmployeeId),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const people = employees.data?.items ?? [];

  const submit = async () => {
    setFieldErrors({});

    try {
      const saved = await save.mutateAsync({ id: project?.id, body: form });
      toast.success(project ? "Project updated" : "Project created", saved.name);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
      }

      toast.error("That didn't save", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      description="Projects group work and give it an owner, a schedule and a progress figure."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending || !form.name.trim() || !form.ownerEmployeeId}>
            {save.isPending ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name?.[0]}
            required
          />
        </div>

        <Input
          label="Code"
          hint="A short internal reference, e.g. APOLLO. Optional."
          value={form.code ?? ""}
          onChange={(e) => setForm({ ...form, code: e.target.value || null })}
          error={fieldErrors.code?.[0]}
        />

        <Select
          label="Priority"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: Number(e.target.value) as TaskPriority })}
        >
          {[TaskPriority.Urgent, TaskPriority.High, TaskPriority.Medium, TaskPriority.Low].map((p) => (
            <option key={p} value={p}>
              {taskPriorityLabels[p]}
            </option>
          ))}
        </Select>

        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value || null })}
            error={fieldErrors.description?.[0]}
          />
        </div>

        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: Number(e.target.value) as ProjectStatus })}
        >
          {[
            ProjectStatus.Planning,
            ProjectStatus.Active,
            ProjectStatus.OnHold,
            ProjectStatus.Completed,
            ProjectStatus.Cancelled,
          ].map((s) => (
            <option key={s} value={s}>
              {projectStatusLabels[s]}
            </option>
          ))}
        </Select>

        <Select
          label="Department"
          value={form.departmentId ?? ""}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value || null })}
          error={fieldErrors.departmentId?.[0]}
        >
          <option value="">No department</option>
          {(departments.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Input
          label="Start date"
          type="date"
          value={form.startDate ?? ""}
          onChange={(e) => setForm({ ...form, startDate: e.target.value || null })}
          error={fieldErrors.startDate?.[0]}
        />

        <Input
          label="Due date"
          type="date"
          value={form.dueDate ?? ""}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
          error={fieldErrors.dueDate?.[0]}
        />

        <Select
          label="Owner"
          hint="Accountable for the outcome."
          value={form.ownerEmployeeId}
          onChange={(e) => setForm({ ...form, ownerEmployeeId: e.target.value })}
          error={fieldErrors.ownerEmployeeId?.[0]}
          required
        >
          <option value="">Choose somebody</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </Select>

        <Select
          label="Project manager"
          hint="Runs it day to day. Told before the owner when work slips."
          value={form.managerEmployeeId ?? ""}
          onChange={(e) => setForm({ ...form, managerEmployeeId: e.target.value || null })}
          error={fieldErrors.managerEmployeeId?.[0]}
        >
          <option value="">Same as the owner</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </Select>
      </div>
    </Dialog>
  );
}

function blank(ownEmployeeId: string): SaveProjectBody {
  return {
    name: "",
    code: null,
    description: null,
    status: ProjectStatus.Planning,
    priority: TaskPriority.Medium,
    startDate: null,
    dueDate: null,
    // Defaulting to the person creating it: they are usually who is accountable, and a required
    // field with no sensible default is a form people abandon.
    ownerEmployeeId: ownEmployeeId,
    managerEmployeeId: null,
    departmentId: null,
    branchId: null,
    teamId: null,
  };
}

// ---------- Members ----------

export function ProjectMembersPanel({ project }: { project: ProjectResponse }) {
  const { can } = useSession();
  const members = useProjectMembers(project.id);
  const employees = useEmployees({ pageSize: 100 });
  const add = useAddProjectMember();
  const remove = useRemoveProjectMember();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>(ProjectMemberRole.Member);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const mayManage = can(Permission.projectMemberManage);

  const current = members.data ?? [];
  const available = (employees.data?.items ?? []).filter(
    (person) => !current.some((member) => member.employeeId === person.id),
  );

  const submit = async () => {
    try {
      await add.mutateAsync({ projectId: project.id, employeeId, role });
      toast.success("Added to the project");
      setAdding(false);
      setEmployeeId("");
      setRole(ProjectMemberRole.Member);
    } catch (error) {
      toast.error("That didn't work", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const confirmRemoval = async () => {
    if (!removingId) return;

    try {
      await remove.mutateAsync({ projectId: project.id, employeeId: removingId });
      toast.success("Removed from the project");
    } catch (error) {
      toast.error("That didn't work", error instanceof ApiError ? error.message : "Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Members"
        description="Being on a project is what lets somebody see it, whatever their scope."
        action={
          mayManage && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <UserPlus aria-hidden className="size-4" />
              Add
            </Button>
          )
        }
      />

      <QueryBoundary
        isLoading={members.isLoading}
        error={members.error}
        data={members.data}
        onRetry={() => members.refetch()}
        loadingFallback={<div className="p-4"><CardSkeleton /></div>}
        isEmpty={(d) => d.length === 0}
        emptyState={
          <EmptyState
            title="Nobody on this project yet"
            description="Add the people doing the work so they can see it and be assigned to it."
          />
        }
      >
        {(data) => (
          <ul className="divide-y divide-slate-100">
            {data.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={member.employeeName} src={member.photoUrl} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{member.employeeName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {member.jobTitle ?? "—"}
                    {member.departmentName ? ` · ${member.departmentName}` : ""}
                  </p>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="numeric text-sm font-medium text-slate-900">{member.openTaskCount}</p>
                  <p className="text-xs text-slate-500">open</p>
                </div>

                {member.overdueTaskCount > 0 && (
                  <Badge tone="danger">{member.overdueTaskCount} late</Badge>
                )}

                <ProjectMemberRoleBadge role={member.role} />

                {mayManage && member.employeeId !== project.ownerEmployeeId && (
                  <button
                    type="button"
                    onClick={() => setRemovingId(member.employeeId)}
                    aria-label={`Remove ${member.employeeName} from this project`}
                    className="-m-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger-600"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add somebody to this project"
        description="They will be able to see the project and its tasks."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={add.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={add.isPending || !employeeId}>
              {add.isPending ? "Adding…" : "Add to project"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Select
            label="Person"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          >
            <option value="">Choose somebody</option>
            {available.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </Select>

          <Select
            label="Role on this project"
            hint="A lead can change the project. A viewer can only read it."
            value={role}
            onChange={(e) => setRole(Number(e.target.value) as ProjectMemberRole)}
          >
            {[ProjectMemberRole.Member, ProjectMemberRole.Lead, ProjectMemberRole.Viewer].map((r) => (
              <option key={r} value={r}>
                {projectMemberRoleLabels[r]}
              </option>
            ))}
          </Select>
        </div>
      </Dialog>

      <ConfirmDialog
        open={removingId !== null}
        onClose={() => setRemovingId(null)}
        onConfirm={confirmRemoval}
        title="Remove from this project?"
        message="They will no longer be able to see it. Their completed work stays on the project."
        confirmLabel="Remove"
        loading={remove.isPending}
      />
    </Card>
  );
}

// ---------- Activity ----------

export function ActivityFeed({
  items,
  emptyDescription,
}: {
  items: ProjectActivityResponse[];
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock aria-hidden className="size-5" />}
        title="Nothing has happened yet"
        description={emptyDescription ?? "Activity appears here as work moves."}
      />
    );
  }

  return (
    <ol className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* The server already wrote this for a person to read, which is why an unknown
                  kind from a newer backend still renders something useful. */}
              <p className="text-sm text-slate-900">{item.summary}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {/* No actor means the system did it - an escalation, not a person. */}
                {item.actorName ?? "Workeva"} · {formatAgo(item.createdAt)}
              </p>
            </div>
            <Badge tone="neutral" className="shrink-0">
              {projectActivityLabels[item.kind] ?? "Activity"}
            </Badge>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- A task's advanced panels ----------

/**
 * Everything that hangs off one task: its checklist, the conversation, what blocks it and what
 * is attached. Opened on demand from the task list, so each panel fetches its own data.
 */
export function TaskDetailPanels({
  task,
  siblings,
}: {
  task: TaskResponse;
  siblings: TaskResponse[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TaskChecklistPanel task={task} />
      <TaskDependenciesPanel task={task} siblings={siblings} />
      <TaskCommentsPanel task={task} />
      <TaskAttachmentsPanel task={task} />
    </div>
  );
}

function TaskChecklistPanel({ task }: { task: TaskResponse }) {
  const checklist = useTaskChecklist(task.id);
  const add = useAddChecklistItem();
  const setDone = useSetChecklistItemDone();
  const remove = useRemoveChecklistItem();
  const toast = useToast();

  const [title, setTitle] = useState("");

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      await add.mutateAsync({ taskId: task.id, title: trimmed });
      setTitle("");
    } catch (error) {
      toast.error("That didn't save", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const items = checklist.data ?? [];
  const done = items.filter((i) => i.isDone).length;

  return (
    <Card>
      <CardHeader
        title="Checklist"
        description={items.length > 0 ? `${done} of ${items.length} done` : "Break the task into steps."}
      />

      <CardBody className="space-y-2">
        {checklist.isLoading ? (
          <CardSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No steps yet.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <Checkbox
                  label={item.title}
                  checked={item.isDone}
                  onChange={(e) =>
                    setDone.mutate({ taskId: task.id, itemId: item.id, isDone: e.target.checked })
                  }
                />
                <button
                  type="button"
                  onClick={() => remove.mutate({ taskId: task.id, itemId: item.id })}
                  aria-label={`Remove "${item.title}"`}
                  className="-m-1 ml-auto rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger-600"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <Input
            label="Add a step"
            placeholder="Add a step"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button size="sm" variant="secondary" onClick={submit} disabled={add.isPending || !title.trim()}>
            <Plus aria-hidden className="size-4" />
            <span className="sr-only">Add step</span>
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function TaskCommentsPanel({ task }: { task: TaskResponse }) {
  const { can } = useSession();
  const comments = useTaskComments(task.id);
  const add = useAddTaskComment();
  const remove = useRemoveTaskComment();
  const toast = useToast();

  const [body, setBody] = useState("");

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      await add.mutateAsync({ taskId: task.id, body: trimmed });
      setBody("");
    } catch (error) {
      toast.error("That didn't post", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const items = comments.data ?? [];

  return (
    <Card>
      <CardHeader title="Comments" description="Discussion about this task." />

      <CardBody className="space-y-3">
        {comments.isLoading ? (
          <CardSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((comment) => (
              <li key={comment.id} className="flex gap-2.5">
                <Avatar name={comment.authorName} src={comment.authorPhotoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-900">{comment.authorName}</span>{" "}
                    {formatAgo(comment.createdAt)}
                    {comment.editedAt && " · edited"}
                  </p>
                  <p className="mt-0.5 text-sm break-words whitespace-pre-wrap text-slate-800">
                    {comment.body}
                  </p>
                </div>
                {comment.isMine && (
                  <button
                    type="button"
                    onClick={() => remove.mutate({ taskId: task.id, commentId: comment.id })}
                    aria-label="Delete your comment"
                    className="-m-1 shrink-0 self-start rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger-600"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {can(Permission.taskComment) && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <Textarea
              label="Add a comment"
              rows={2}
              placeholder="Add a comment"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button size="sm" onClick={submit} disabled={add.isPending || !body.trim()}>
              <MessageSquare aria-hidden className="size-4" />
              {add.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TaskDependenciesPanel({ task, siblings }: { task: TaskResponse; siblings: TaskResponse[] }) {
  const { can } = useSession();
  const dependencies = useTaskDependencies(task.id);
  const add = useAddTaskDependency();
  const remove = useRemoveTaskDependency();
  const toast = useToast();

  const [dependsOnTaskId, setDependsOnTaskId] = useState("");

  // Memoised so the candidate list below does not recompute on every render: a new array
  // literal each time would change the useMemo dependency each time, which is what the lint
  // rule is pointing at.
  const items = useMemo(() => dependencies.data ?? [], [dependencies.data]);

  // Only tasks on the same project can block this one, and not itself or something already
  // blocking it. The API refuses all three; narrowing the list here is so the person is not
  // offered a choice that will be rejected.
  const candidates = useMemo(
    () =>
      siblings.filter(
        (candidate) =>
          candidate.id !== task.id &&
          candidate.projectId === task.projectId &&
          !items.some((dependency) => dependency.dependsOnTaskId === candidate.id),
      ),
    [siblings, task.id, task.projectId, items],
  );

  const submit = async () => {
    if (!dependsOnTaskId) return;

    try {
      await add.mutateAsync({ taskId: task.id, dependsOnTaskId });
      setDependsOnTaskId("");
    } catch (error) {
      toast.error("That dependency wasn't added", error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const mayManage = can(Permission.taskDependencyManage);

  return (
    <Card>
      <CardHeader
        title="Waiting for"
        description="This task can't start until these are finished or cancelled."
      />

      <CardBody className="space-y-2">
        {dependencies.isLoading ? (
          <CardSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing is blocking this task.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((dependency) => (
              <li key={dependency.id} className="flex items-center gap-2">
                <Link2 aria-hidden className="size-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {dependency.dependsOnTitle}
                </span>
                {dependency.isBlocking ? (
                  <Badge tone="warning">Open</Badge>
                ) : (
                  <Badge tone="success" icon={<Check aria-hidden className="size-3" />}>
                    Settled
                  </Badge>
                )}
                {mayManage && (
                  <button
                    type="button"
                    onClick={() => remove.mutate({ taskId: task.id, dependencyId: dependency.id })}
                    aria-label={`Stop waiting for "${dependency.dependsOnTitle}"`}
                    className="-m-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger-600"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {mayManage && task.projectId && (
          <div className="flex gap-2 pt-1">
            <Select
              label="Add a dependency"
              value={dependsOnTaskId}
              onChange={(e) => setDependsOnTaskId(e.target.value)}
            >
              <option value="">Wait for another task…</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              onClick={submit}
              disabled={add.isPending || !dependsOnTaskId}
            >
              <Plus aria-hidden className="size-4" />
              <span className="sr-only">Add dependency</span>
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TaskAttachmentsPanel({ task }: { task: TaskResponse }) {
  const { can } = useSession();
  const attachments = useTaskAttachments(task.id);
  const upload = useUploadTaskAttachment();
  const download = useTaskAttachmentDownload();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  /**
   * Storage may not be configured for this deployment, in which case the API answers 503 and
   * says so. That is a normal state - a development environment runs that way - so it is shown
   * as an explanation rather than as a failure.
   */
  const storageUnavailable =
    attachments.error instanceof ApiError && attachments.error.status === 503;

  const choose = () => input.current?.click();

  const send = async (file: File) => {
    try {
      await upload.mutateAsync({ taskId: task.id, file });
      toast.success("File attached", file.name);
    } catch (error) {
      toast.error("That file wasn't attached", error instanceof ApiError ? error.message : "Please try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const open = async (attachmentId: string, fileName: string) => {
    try {
      const link = await download.mutateAsync({ taskId: task.id, attachmentId });
      window.open(link.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(`Couldn't open ${fileName}`, error instanceof ApiError ? error.message : "Please try again.");
    }
  };

  const items = attachments.data ?? [];

  return (
    <Card>
      <CardHeader
        title="Attachments"
        action={
          can(Permission.taskAttach) &&
          !storageUnavailable && (
            <Button size="sm" variant="secondary" onClick={choose} disabled={upload.isPending}>
              <Paperclip aria-hidden className="size-4" />
              {upload.isPending ? "Uploading…" : "Attach"}
            </Button>
          )
        }
      />

      <CardBody>
        <input
          ref={input}
          type="file"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void send(file);
          }}
        />

        {storageUnavailable ? (
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-600" />
            File storage isn&apos;t set up for this deployment yet, so attachments aren&apos;t
            available. Everything else on this task works.
          </p>
        ) : attachments.isLoading ? (
          <CardSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing attached.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((attachment) => (
              <li key={attachment.id} className="flex items-center gap-2">
                <Paperclip aria-hidden className="size-4 shrink-0 text-slate-400" />
                <button
                  type="button"
                  onClick={() => open(attachment.id, attachment.fileName)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-brand-700 underline-offset-2 hover:underline"
                >
                  {attachment.fileName}
                </button>
                <span className="numeric shrink-0 text-xs text-slate-500">
                  {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB
                </span>
                {!attachment.isUploaded && <Badge tone="warning">Pending</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

// ---------- A compact task row for a project page ----------

export function ProjectTaskRow({
  task,
  onOpen,
  isOpen,
}: {
  task: TaskResponse;
  onOpen: () => void;
  isOpen: boolean;
}) {
  const counts = [
    task.subtaskCount > 0 && `${task.completedSubtaskCount}/${task.subtaskCount} subtasks`,
    task.checklistCount > 0 && `${task.completedChecklistCount}/${task.checklistCount} steps`,
    task.commentCount > 0 && `${task.commentCount} comment${task.commentCount === 1 ? "" : "s"}`,
    task.attachmentCount > 0 && `${task.attachmentCount} file${task.attachmentCount === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];

  return (
    <div className={task.parentTaskId ? "border-l-2 border-slate-200 pl-4" : ""}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            {task.isOverdue && <OverdueBadge />}
            {task.isBlocked && <BlockedBadge count={task.blockedByCount} />}
          </div>

          {counts.length > 0 && (
            <p className="mt-1 truncate text-xs text-slate-500">{counts.join(" · ")}</p>
          )}
        </div>

        <div className="hidden w-28 shrink-0 sm:block">
          <ProgressBar
            value={task.status === TaskStatus.Completed ? 100 : task.progressPercent}
            label="Done"
            tone={task.isOverdue ? "danger" : "info"}
          />
        </div>

        <div className="hidden w-32 shrink-0 text-right sm:block">
          <p className="truncate text-xs text-slate-600">{task.assigneeName ?? "Unassigned"}</p>
          <p className="text-xs text-slate-500">
            {task.dueDate ? formatPlainDate(task.dueDate) : "No due date"}
          </p>
        </div>
      </button>
    </div>
  );
}

// ---------- The empty state for a company with no projects ----------

export function NoProjectsYet({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<FolderKanban aria-hidden className="size-5" />}
      title="No projects yet"
      description="A project groups work, gives it an owner and a schedule, and shows how far along it is."
      action={onCreate && <Button size="sm" onClick={onCreate}>New project</Button>}
    />
  );
}

export { initials };
