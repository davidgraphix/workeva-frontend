"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Plus, Search } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import { TaskDialog, TaskList } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/field";
import { Card, StatCard } from "@/components/ui/surfaces";
import { Pagination } from "@/components/ui/data-table";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { useDepartments, useTaskSummary, useTasks } from "@/hooks/use-workeva";
import { Permission } from "@/lib/permissions";
import { TaskPriority, TaskStatus, taskPriorityLabels, taskStatusLabels, type TaskResponse } from "@/lib/types";

function TasksContent() {
  const { can } = useSession();
  const searchParams = useSearchParams();
  const summary = useTaskSummary(false);
  const departments = useDepartments();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(searchParams.get("overdue") === "1");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TaskResponse | "new" | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const tasks = useTasks({
    search: search || undefined,
    status: status === "" ? undefined : (Number(status) as TaskStatus),
    priority: priority === "" ? undefined : (Number(priority) as TaskPriority),
    departmentId: departmentId || undefined,
    onlyOverdue: onlyOverdue || undefined,
    page,
    pageSize: 25,
  });

  if (!can(Permission.taskView)) return <NoAccess />;

  return (
    <>
      <PageHeader title="Tasks" description="Work across your team."
        actions={can(Permission.taskCreate) && <Button onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" /> New task</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {summary.isLoading || !summary.data ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />) : (
          <>
            <StatCard label="Total" value={summary.data.total} />
            <StatCard label="To do" value={summary.data.toDo} />
            <StatCard label="In progress" value={summary.data.inProgress} tone="info" />
            <StatCard label="Completed" value={summary.data.completed} tone="success" />
            <StatCard label="Overdue" value={summary.data.overdue} tone={summary.data.overdue > 0 ? "danger" : "neutral"} />
          </>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 md:grid-cols-5 md:items-end">
          <div className="relative col-span-2 md:col-span-2">
            <label htmlFor="task-search" className="sr-only">Search tasks</label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input id="task-search" type="search" placeholder="Search by title" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              className="block h-10 w-full rounded-md border-0 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600" />
          </div>
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Any</option>
            {[TaskStatus.ToDo, TaskStatus.InProgress, TaskStatus.Completed, TaskStatus.Cancelled].map((s) => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
          </Select>
          <Select label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">Any</option>
            {[TaskPriority.Urgent, TaskPriority.High, TaskPriority.Medium, TaskPriority.Low].map((p) => <option key={p} value={p}>{taskPriorityLabels[p]}</option>)}
          </Select>
          <Select label="Department" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
            <option value="">Any</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <div className="col-span-2 md:col-span-5">
            <Checkbox label="Only overdue" checked={onlyOverdue} onChange={(e) => { setOnlyOverdue(e.target.checked); setPage(1); }} />
          </div>
        </div>

        <QueryBoundary isLoading={tasks.isLoading} error={tasks.error} data={tasks.data} onRetry={() => tasks.refetch()}
          isEmpty={(d) => d.items.length === 0}
          emptyState={<EmptyState icon={<ClipboardList aria-hidden className="size-5" />} title="No tasks match"
            description="Create a task and assign it to someone on your team."
            action={can(Permission.taskCreate) && <Button size="sm" onClick={() => setEditing("new")}>New task</Button>} />}>
          {(data) => (
            <>
              <TaskList tasks={data.items} showAssignee onEdit={(t) => setEditing(t)} />
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>

      <TaskDialog open={editing !== null} onClose={() => setEditing(null)} task={editing === "new" ? null : editing} />
    </>
  );
}

export default function TasksPage() {
  return <Suspense fallback={null}><TasksContent /></Suspense>;
}
