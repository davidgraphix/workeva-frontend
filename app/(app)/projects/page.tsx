"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Plus, Search } from "lucide-react";

import { NoAccess, PageHeader } from "@/components/app/page-header";
import {
  ActivityFeed,
  NoProjectsYet,
  ProjectCard,
  ProjectDialog,
} from "@/components/features/projects";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/data-table";
import { Avatar, Badge, Card, CardHeader, StatCard } from "@/components/ui/surfaces";
import { CardSkeleton, EmptyState, QueryBoundary } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { useProjectDashboard, useProjects } from "@/hooks/use-projects";
import {
  ProjectStatus,
  TaskPriority,
  projectStatusLabels,
  taskPriorityLabels,
} from "@/lib/types";

/**
 * The project portfolio.
 *
 * Counts come from the dashboard endpoint and the list from the search endpoint, both narrowed
 * by the server to what this caller may see - so two people in the same company see different
 * totals, and each sees the truth about what they are allowed to know.
 */
function ProjectsContent() {
  const { can } = useSession();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [onlyMine, setOnlyMine] = useState(searchParams.get("mine") === "1");
  const [onlyOverdue, setOnlyOverdue] = useState(searchParams.get("overdue") === "1");
  const [onlyAtRisk, setOnlyAtRisk] = useState(searchParams.get("risk") === "1");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<"new" | null>(null);

  // Debounced, so typing a name does not issue a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dashboard = useProjectDashboard();

  const projects = useProjects({
    search: search || undefined,
    status: status === "" ? undefined : (Number(status) as ProjectStatus),
    priority: priority === "" ? undefined : (Number(priority) as TaskPriority),
    onlyMine: onlyMine || undefined,
    onlyOverdue: onlyOverdue || undefined,
    onlyAtRisk: onlyAtRisk || undefined,
    includeArchived: includeArchived || undefined,
    page,
    pageSize: 12,
  });

  if (!can(Permission.projectView)) return <NoAccess />;

  // The whole module is gated by a feature flag that answers 404, so a 404 here means the
  // feature is not on for this organization rather than that something is broken. Saying so is
  // more useful than an error with a retry button that will never help.
  const notEnabled =
    (projects.error instanceof ApiError && projects.error.status === 404) ||
    (dashboard.error instanceof ApiError && dashboard.error.status === 404);

  if (notEnabled) {
    return (
      <>
        <PageHeader title="Projects" description="Plan work, track progress and see what is at risk." />
        <Card>
          <EmptyState
            icon={<FolderKanban aria-hidden className="size-5" />}
            title="Projects aren't switched on for your company"
            description="An administrator can enable the projects feature in Settings. Until then, tasks work exactly as they do today."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Plan work, track progress and see what is at risk."
        actions={
          can(Permission.projectCreate) && (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" />
              New project
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {dashboard.isLoading || !dashboard.data ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Projects" value={dashboard.data.totalProjects} />
            <StatCard label="Active" value={dashboard.data.activeProjects} tone="info" />
            <StatCard label="Completed" value={dashboard.data.completedProjects} tone="success" />
            <StatCard
              label="At risk"
              value={dashboard.data.atRiskProjects}
              tone={dashboard.data.atRiskProjects > 0 ? "warning" : "neutral"}
              hint="Heading for trouble"
            />
            <StatCard
              label="Overdue"
              value={dashboard.data.overdueProjects}
              tone={dashboard.data.overdueProjects > 0 ? "danger" : "neutral"}
            />
          </>
        )}
      </div>

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 md:grid-cols-4 md:items-end">
          <div className="relative col-span-2">
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="project-search"
              type="search"
              placeholder="Search by name or code"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="block h-10 w-full rounded-md border-0 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
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
            label="Priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            {[TaskPriority.Urgent, TaskPriority.High, TaskPriority.Medium, TaskPriority.Low].map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabels[p]}
              </option>
            ))}
          </Select>

          <div className="col-span-2 flex flex-wrap gap-x-5 gap-y-2 md:col-span-4">
            <Checkbox
              label="Only mine"
              checked={onlyMine}
              onChange={(e) => {
                setOnlyMine(e.target.checked);
                setPage(1);
              }}
            />
            <Checkbox
              label="Only overdue"
              checked={onlyOverdue}
              onChange={(e) => {
                setOnlyOverdue(e.target.checked);
                setPage(1);
              }}
            />
            <Checkbox
              label="Only at risk"
              checked={onlyAtRisk}
              onChange={(e) => {
                setOnlyAtRisk(e.target.checked);
                setPage(1);
              }}
            />
            <Checkbox
              label="Include archived"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setPage(1);
              }}
            />
          </div>
        </div>

        <QueryBoundary
          isLoading={projects.isLoading}
          error={projects.error}
          data={projects.data}
          onRetry={() => projects.refetch()}
          loadingFallback={
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          }
          isEmpty={(d) => d.items.length === 0}
          emptyState={
            search || status || priority || onlyMine || onlyOverdue || onlyAtRisk ? (
              <EmptyState
                icon={<FolderKanban aria-hidden className="size-5" />}
                title="No projects match"
                description="Try clearing a filter."
              />
            ) : (
              <NoProjectsYet
                onCreate={can(Permission.projectCreate) ? () => setEditing("new") : undefined}
              />
            )
          }
        >
          {(data) => (
            <>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>

      {/* The manager's view of the portfolio: who is carrying what, and what has moved. Shown
          below the list rather than above it, because the list is what somebody came here for. */}
      {dashboard.data && (dashboard.data.teamWorkload.length > 0 || dashboard.data.recentActivity.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Workload"
              description="Open work per person, across the projects you can see. Ordered by what has already slipped."
            />
            {dashboard.data.teamWorkload.length === 0 ? (
              <EmptyState title="Nothing outstanding" description="No open tasks are assigned." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {dashboard.data.teamWorkload.map((person) => (
                  <li key={person.employeeId} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={person.employeeName} src={person.photoUrl} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{person.employeeName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {person.teamName ?? "No team"} · {person.projectCount} project
                        {person.projectCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    {person.overdueTaskCount > 0 && (
                      <Badge tone="danger">{person.overdueTaskCount} late</Badge>
                    )}

                    <div className="w-12 shrink-0 text-right">
                      <p className="numeric text-sm font-medium text-slate-900">{person.openTaskCount}</p>
                      <p className="text-xs text-slate-500">open</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" description="The latest across your projects." />
            <ActivityFeed
              items={dashboard.data.recentActivity}
              emptyDescription="Activity appears here as projects and their tasks move."
            />
          </Card>
        </div>
      )}

      <ProjectDialog open={editing !== null} onClose={() => setEditing(null)} project={null} />
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsContent />
    </Suspense>
  );
}
