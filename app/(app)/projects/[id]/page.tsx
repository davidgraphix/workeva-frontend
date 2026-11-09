"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, ClipboardList, Pencil, Plus } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  ActivityFeed,
  ProjectDialog,
  ProjectMembersPanel,
  ProjectTaskRow,
  TaskDetailPanels,
} from "@/components/features/projects";
import { TaskDialog } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/surfaces";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CardSkeleton, EmptyState, PageSkeleton, QueryBoundary } from "@/components/ui/states";
import {
  AtRiskBadge,
  OverdueBadge,
  ProgressBar,
  ProjectStatusBadge,
  TaskPriorityBadge,
} from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { formatPlainDate } from "@/lib/format";
import { Permission } from "@/lib/permissions";
import { useTasks } from "@/hooks/use-workeva";
import {
  useProject,
  useProjectActivity,
  useSetProjectArchived,
  useSetProjectStatus,
} from "@/hooks/use-projects";
import { ProjectStatus, projectStatusLabels, type TaskResponse } from "@/lib/types";

/**
 * One project: its figures, its work, its people and its history.
 *
 * Tasks come from the V1 task endpoint filtered by project, because they are tasks - there is no
 * second task system, and the same list, the same permissions and the same status transitions
 * apply whether a task is reached from here or from the tasks page.
 */
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useSession();
  const toast = useToast();

  const project = useProject(id);
  const activity = useProjectActivity(id);
  const setStatus = useSetProjectStatus();
  const setArchived = useSetProjectArchived();

  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasks = useTasks({ projectId: id, pageSize: 100 });

  if (!can(Permission.projectView)) return <NoAccess />;

  if (project.isLoading) return <PageSkeleton />;

  if (project.error) {
    const apiError = project.error instanceof ApiError ? project.error : null;

    // 404 covers both "no such project" and "not yours", deliberately - the API refuses to
    // distinguish them so ids cannot be probed, and this page says the same thing.
    return (
      <>
        <PageHeader title="Project" />
        <Card>
          <EmptyState
            icon={<ClipboardList aria-hidden className="size-5" />}
            title={apiError?.status === 404 ? "We couldn't find that project" : "We couldn't load this project"}
            description={
              apiError?.status === 404
                ? "It may have been archived, or you may not be on it."
                : apiError?.message
            }
            action={
              <Link
                href="/projects"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft aria-hidden className="size-4" />
                Back to projects
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const data = project.data;
  if (!data) return null;

  const allTasks = tasks.data?.items ?? [];
  const topLevel = allTasks.filter((task) => !task.parentTaskId);
  const subtasksOf = (taskId: string) => allTasks.filter((task) => task.parentTaskId === taskId);

  const mayWrite = can(Permission.projectUpdate) && !data.isArchived;
  const tone = data.isOverdue ? "danger" : data.isAtRisk ? "warning" : "info";

  const changeStatus = async (next: ProjectStatus) => {
    try {
      await setStatus.mutateAsync({ id, status: next });
      toast.success("Status updated", projectStatusLabels[next]);
    } catch (error) {
      toast.error(
        "That didn't save",
        error instanceof ApiError ? error.message : "Please try again.",
      );
    }
  };

  const toggleArchive = async () => {
    try {
      await setArchived.mutateAsync({ id, isArchived: !data.isArchived });
      toast.success(data.isArchived ? "Project restored" : "Project archived");
    } catch (error) {
      toast.error(
        data.isArchived ? "That didn't restore" : "That didn't archive",
        error instanceof ApiError ? error.message : "Please try again.",
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <div className="mb-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft aria-hidden className="size-4" />
          All projects
        </Link>
      </div>

      <PageHeader
        title={data.name}
        description={data.description ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can(Permission.projectUpdate) && (
              <Button variant="secondary" onClick={() => setEditing(true)} disabled={data.isArchived}>
                <Pencil aria-hidden className="size-4" />
                Edit
              </Button>
            )}
            {can(Permission.projectArchive) && (
              <Button variant="secondary" onClick={() => setArchiving(true)}>
                {data.isArchived ? (
                  <>
                    <ArchiveRestore aria-hidden className="size-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive aria-hidden className="size-4" />
                    Archive
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={data.status} />
        <TaskPriorityBadge priority={data.priority} />
        {data.isOverdue && <OverdueBadge />}
        {data.isAtRisk && <AtRiskBadge />}
        {data.isArchived && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Archived
          </span>
        )}
        {data.code && <span className="numeric text-xs text-slate-500">{data.code}</span>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tasks" value={`${data.completedTaskCount}/${data.taskCount}`} />
        <StatCard
          label="Overdue tasks"
          value={data.overdueTaskCount}
          tone={data.overdueTaskCount > 0 ? "danger" : "neutral"}
        />
        <StatCard label="Members" value={data.memberCount} />
        <StatCard
          label="Due"
          value={data.dueDate ? formatPlainDate(data.dueDate) : "—"}
          tone={data.isOverdue ? "danger" : "neutral"}
          hint={data.startDate ? `From ${formatPlainDate(data.startDate)}` : undefined}
        />
      </div>

      <Card className="mb-5">
        <CardBody>
          <ProgressBar value={data.progressPercent} label="Overall progress" tone={tone} />

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Owner</dt>
              <dd className="font-medium text-slate-900">{data.ownerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Project manager</dt>
              <dd className="font-medium text-slate-900">{data.managerName ?? "The owner"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{data.departmentName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Team</dt>
              <dd className="font-medium text-slate-900">{data.teamName ?? "—"}</dd>
            </div>
          </dl>

          {mayWrite && (
            <div className="mt-4 max-w-xs border-t border-slate-100 pt-4">
              <Select
                label="Move status"
                value={data.status}
                onChange={(e) => changeStatus(Number(e.target.value) as ProjectStatus)}
                disabled={setStatus.isPending}
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
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Work"
              description="Tasks on this project. Open one to see its checklist, comments and dependencies."
              action={
                can(Permission.taskCreate) &&
                !data.isArchived && (
                  <Button size="sm" variant="secondary" onClick={() => setCreatingTask(true)}>
                    <Plus aria-hidden className="size-4" />
                    Add task
                  </Button>
                )
              }
            />

            <QueryBoundary
              isLoading={tasks.isLoading}
              error={tasks.error}
              data={tasks.data}
              onRetry={() => tasks.refetch()}
              loadingFallback={
                <div className="p-4">
                  <CardSkeleton />
                </div>
              }
              isEmpty={() => topLevel.length === 0}
              emptyState={
                <EmptyState
                  icon={<ClipboardList aria-hidden className="size-5" />}
                  title="No work on this project yet"
                  description="Add the first task to start tracking progress."
                  action={
                    can(Permission.taskCreate) &&
                    !data.isArchived && (
                      <Button size="sm" onClick={() => setCreatingTask(true)}>
                        Add task
                      </Button>
                    )
                  }
                />
              }
            >
              {() => (
                <ul className="divide-y divide-slate-100">
                  {topLevel.map((task) => (
                    <li key={task.id}>
                      <ProjectTaskRow
                        task={task}
                        isOpen={openTaskId === task.id}
                        onOpen={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
                      />

                      {subtasksOf(task.id).map((subtask) => (
                        <ProjectTaskRow
                          key={subtask.id}
                          task={subtask}
                          isOpen={openTaskId === subtask.id}
                          onOpen={() => setOpenTaskId(openTaskId === subtask.id ? null : subtask.id)}
                        />
                      ))}

                      {openTaskId !== null && isInBranch(openTaskId, task, subtasksOf(task.id)) && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                          <TaskDetailPanels
                            task={findTask(allTasks, openTaskId)!}
                            siblings={allTasks}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </Card>
        </div>

        <div className="space-y-5">
          <ProjectMembersPanel project={data} />

          <Card>
            <CardHeader title="Activity" description="What has happened on this project." />
            <QueryBoundary
              isLoading={activity.isLoading}
              error={activity.error}
              data={activity.data}
              onRetry={() => activity.refetch()}
              loadingFallback={
                <div className="p-4">
                  <CardSkeleton />
                </div>
              }
            >
              {(feed) => <ActivityFeed items={feed.items} />}
            </QueryBoundary>
          </Card>
        </div>
      </div>

      <ProjectDialog open={editing} onClose={() => setEditing(false)} project={data} />

      <TaskDialog
        open={creatingTask}
        onClose={() => setCreatingTask(false)}
        task={null}
        projectId={id}
      />

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={toggleArchive}
        title={data.isArchived ? "Restore this project?" : "Archive this project?"}
        message={
          data.isArchived
            ? "It will appear in the project list again and can be edited."
            : "It will drop out of the default list. Nothing is deleted - its tasks, comments and history stay. Open tasks must be finished or cancelled first."
        }
        confirmLabel={data.isArchived ? "Restore" : "Archive"}
        tone={data.isArchived ? "primary" : "danger"}
        loading={setArchived.isPending}
      />
    </>
  );
}

/** True when the open task is this row or one of its subtasks, so the panel renders in place. */
function isInBranch(openTaskId: string, task: TaskResponse, subtasks: TaskResponse[]): boolean {
  return openTaskId === task.id || subtasks.some((subtask) => subtask.id === openTaskId);
}

function findTask(tasks: TaskResponse[], id: string): TaskResponse | undefined {
  return tasks.find((task) => task.id === id);
}
