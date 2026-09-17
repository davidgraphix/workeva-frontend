"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { TaskDialog, TaskList } from "@/components/features/shared";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surfaces";
import { Pagination } from "@/components/ui/data-table";
import { QueryBoundary } from "@/components/ui/states";
import { useTaskSummary, useTasks, type TaskFilters } from "@/hooks/use-workeva";
import { Permission } from "@/lib/permissions";
import { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "open", label: "My tasks" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyTasksPage() {
  const { can } = useSession();
  const [tab, setTab] = useState<TabKey>("open");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const summary = useTaskSummary(true);

  const filters: TaskFilters = { onlyMine: true, page, pageSize: 20 };
  if (tab === "overdue") filters.onlyOverdue = true;
  if (tab === "completed") filters.status = TaskStatus.Completed;

  const tasks = useTasks(filters);
  const openTasks = tab === "open" ? tasks.data?.items.filter((t) => t.status === TaskStatus.ToDo || t.status === TaskStatus.InProgress) : tasks.data?.items;

  const counts: Record<TabKey, number | undefined> = {
    open: summary.data ? summary.data.toDo + summary.data.inProgress : undefined,
    overdue: summary.data?.overdue,
    completed: summary.data?.completed,
  };

  return (
    <>
      <PageHeader
        title="My tasks"
        description={summary.data ? `${summary.data.dueToday} due today` : undefined}
        actions={can(Permission.taskCreate) && <Button onClick={() => setOpen(true)}><Plus aria-hidden className="size-4" /> New task</Button>}
      />

      <div role="tablist" aria-label="Task filter" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
            {counts[t.key] !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <Card>
        <QueryBoundary isLoading={tasks.isLoading} error={tasks.error} data={tasks.data} onRetry={() => tasks.refetch()}>
          {(data) => (
            <>
              <TaskList tasks={openTasks ?? []} />
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>

      <TaskDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
