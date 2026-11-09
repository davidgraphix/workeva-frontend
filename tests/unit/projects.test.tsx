import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api";
import {
  ProjectMemberRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  type ProjectActivityResponse,
  type ProjectMemberResponse,
  type ProjectResponse,
  type TaskResponse,
} from "@/lib/types";

// ---------- shared mocks ----------

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

// `can` is typed to take the permission key, so a test can narrow it to refuse one - which is
// how the "hides the control from somebody without the permission" cases are written. The
// default grants everything.
const session = {
  me: { active: { employeeId: "emp-me" } },
  can: vi.fn((permission: string) => permission.length > 0),
};
vi.mock("@/components/session-provider", () => ({ useSession: () => session }));

const hooks = {
  saveProject: { mutateAsync: vi.fn(), isPending: false },
  members: {
    data: [] as ProjectMemberResponse[],
    isLoading: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  addMember: { mutateAsync: vi.fn(), isPending: false },
  removeMember: { mutateAsync: vi.fn(), isPending: false },
  checklist: { data: [], isLoading: false, error: null as unknown, refetch: vi.fn() },
  comments: { data: [], isLoading: false, error: null as unknown, refetch: vi.fn() },
  dependencies: { data: [], isLoading: false, error: null as unknown, refetch: vi.fn() },
  attachments: { data: [], isLoading: false, error: null as unknown, refetch: vi.fn() },
};

vi.mock("@/hooks/use-projects", () => ({
  useSaveProject: () => hooks.saveProject,
  useProjectMembers: () => hooks.members,
  useAddProjectMember: () => hooks.addMember,
  useRemoveProjectMember: () => hooks.removeMember,
  useTaskChecklist: () => hooks.checklist,
  useAddChecklistItem: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useSetChecklistItemDone: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useRemoveChecklistItem: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useTaskComments: () => hooks.comments,
  useAddTaskComment: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useRemoveTaskComment: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useTaskDependencies: () => hooks.dependencies,
  useAddTaskDependency: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useRemoveTaskDependency: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useTaskAttachments: () => hooks.attachments,
  useUploadTaskAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTaskAttachmentDownload: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveTaskAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/use-workeva", () => ({
  useDepartments: () => ({ data: [{ id: "dep-1", name: "Engineering" }] }),
  useEmployees: () => ({
    data: {
      items: [
        { id: "emp-me", fullName: "Me Myself" },
        { id: "emp-other", fullName: "Someone Else" },
      ],
    },
  }),
}));

// ---------- fixtures ----------

function project(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    id: "p1",
    name: "Apollo",
    code: "APL",
    description: "A project",
    status: ProjectStatus.Active,
    priority: TaskPriority.High,
    startDate: "2026-06-01",
    dueDate: "2026-07-01",
    completedAt: null,
    ownerEmployeeId: "emp-me",
    ownerName: "Me Myself",
    ownerPhotoUrl: null,
    managerEmployeeId: null,
    managerName: null,
    departmentId: "dep-1",
    departmentName: "Engineering",
    branchId: null,
    branchName: null,
    teamId: null,
    teamName: null,
    isArchived: false,
    progressPercent: 40,
    taskCount: 5,
    completedTaskCount: 2,
    overdueTaskCount: 0,
    memberCount: 3,
    isOverdue: false,
    isAtRisk: false,
    isMember: true,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
    ...overrides,
  };
}

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: "t1",
    title: "Draft the plan",
    description: null,
    createdByEmployeeId: "emp-me",
    createdByName: "Me Myself",
    assigneeEmployeeId: "emp-other",
    assigneeName: "Someone Else",
    assigneePhotoUrl: null,
    departmentId: null,
    departmentName: null,
    priority: TaskPriority.Medium,
    status: TaskStatus.ToDo,
    dueDate: "2026-06-20",
    isOverdue: false,
    completedAt: null,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    projectId: "p1",
    projectName: "Apollo",
    teamId: null,
    teamName: null,
    parentTaskId: null,
    startDate: null,
    progressPercent: 0,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    checklistCount: 0,
    completedChecklistCount: 0,
    commentCount: 0,
    attachmentCount: 0,
    additionalAssigneeCount: 0,
    blockedByCount: 0,
    blockingCount: 0,
    isBlocked: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  session.can.mockReturnValue(true);
  hooks.members.data = [];
  hooks.members.error = null;
  hooks.attachments.error = null;
});

// ---------- The project card ----------

describe("ProjectCard", async () => {
  const { ProjectCard } = await import("@/components/features/projects");

  it("shows the name, progress and task counts", () => {
    render(<ProjectCard project={project()} />);

    expect(screen.getByText("Apollo")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();

    // Progress is announced as a value, not only drawn as a width.
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("40");

    // Completed over total, so "how much is left" is readable at a glance.
    expect(screen.getByText("2/5")).toBeTruthy();
  });

  // The card carries the word "Overdue" twice over: once as a badge and once as the label of
  // the overdue-task count. These queries name the badge - a span - so they are about the
  // status being shown rather than about either piece of copy existing somewhere.
  it("marks an overdue project as overdue and not also as at risk", () => {
    render(<ProjectCard project={project({ isOverdue: true, isAtRisk: false })} />);

    expect(screen.getByText("Overdue", { selector: "span" })).toBeTruthy();
    expect(screen.queryByText("At risk", { selector: "span" })).toBeNull();
  });

  it("marks a project heading for trouble as at risk", () => {
    render(<ProjectCard project={project({ isAtRisk: true })} />);

    expect(screen.getByText("At risk", { selector: "span" })).toBeTruthy();
    expect(screen.queryByText("Overdue", { selector: "span" })).toBeNull();
  });

  it("links to the project it describes", () => {
    render(<ProjectCard project={project()} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/projects/p1");
  });
});

// ---------- The project form ----------

describe("ProjectDialog", async () => {
  const { ProjectDialog } = await import("@/components/features/projects");

  it("defaults a new project's owner to the person creating it", () => {
    render(<ProjectDialog open onClose={vi.fn()} project={null} />);

    const owner = screen.getByLabelText(/Owner/) as HTMLSelectElement;
    expect(owner.value).toBe("emp-me");
  });

  it("creates a project and reports it", async () => {
    hooks.saveProject.mutateAsync.mockResolvedValue(project({ name: "New thing" }));

    render(<ProjectDialog open onClose={vi.fn()} project={null} />);

    await userEvent.type(screen.getByLabelText(/^Name/), "New thing");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(hooks.saveProject.mutateAsync).toHaveBeenCalled());

    const call = hooks.saveProject.mutateAsync.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call.id).toBeUndefined();
    expect(call.body.name).toBe("New thing");
    expect(call.body.ownerEmployeeId).toBe("emp-me");

    expect(toast.success).toHaveBeenCalled();
  });

  it("loads an existing project's values for editing", () => {
    render(<ProjectDialog open onClose={vi.fn()} project={project()} />);

    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe("Apollo");
    expect((screen.getByLabelText(/Code/) as HTMLInputElement).value).toBe("APL");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  });

  /**
   * The API validates every field again, including the things a browser cannot know. When it
   * refuses one, the message belongs against that field rather than only in a toast.
   */
  it("shows a field error from the API against its own field", async () => {
    hooks.saveProject.mutateAsync.mockRejectedValue(
      new ApiError(400, { errors: { name: ["A project with that name already exists."] } }),
    );

    render(<ProjectDialog open onClose={vi.fn()} project={null} />);

    await userEvent.type(screen.getByLabelText(/^Name/), "Apollo");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("A project with that name already exists.")).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
  });

  it("will not submit without a name", () => {
    render(<ProjectDialog open onClose={vi.fn()} project={null} />);

    const submit = screen.getByRole("button", { name: "Create project" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});

// ---------- Members ----------

describe("ProjectMembersPanel", async () => {
  const { ProjectMembersPanel } = await import("@/components/features/projects");

  const member = (overrides: Partial<ProjectMemberResponse> = {}): ProjectMemberResponse => ({
    id: "m1",
    employeeId: "emp-other",
    employeeName: "Someone Else",
    photoUrl: null,
    jobTitle: "Engineer",
    departmentId: "dep-1",
    departmentName: "Engineering",
    role: ProjectMemberRole.Member,
    isActive: true,
    addedAt: "2026-06-02T00:00:00Z",
    openTaskCount: 3,
    overdueTaskCount: 0,
    ...overrides,
  });

  it("says so when nobody is on the project yet", () => {
    hooks.members.data = [];

    render(<ProjectMembersPanel project={project()} />);

    expect(screen.getByText("Nobody on this project yet")).toBeTruthy();
  });

  it("lists members with their workload and role", () => {
    hooks.members.data = [member({ openTaskCount: 4, overdueTaskCount: 2 })];

    render(<ProjectMembersPanel project={project()} />);

    expect(screen.getByText("Someone Else")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("2 late")).toBeTruthy();

    // The role badge, not the option of the same name inside the closed "add member" dialog.
    expect(screen.getByText("Member", { selector: "span" })).toBeTruthy();
  });

  /**
   * The owner cannot be removed - a project with no owner is the state the required owner field
   * exists to prevent - so the UI does not offer it. The API refuses it as well.
   */
  it("offers no remove control for the project owner", () => {
    hooks.members.data = [
      member({ id: "m-owner", employeeId: "emp-me", employeeName: "Me Myself" }),
      member(),
    ];

    render(<ProjectMembersPanel project={project({ ownerEmployeeId: "emp-me" })} />);

    expect(screen.queryByRole("button", { name: /Remove Me Myself/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Remove Someone Else/ })).toBeTruthy();
  });

  it("hides the add control from somebody who cannot manage members", () => {
    session.can.mockImplementation((permission: string) => permission !== "project.member.manage");
    hooks.members.data = [member()];

    render(<ProjectMembersPanel project={project()} />);

    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });
});

// ---------- Activity ----------

describe("ActivityFeed", async () => {
  const { ActivityFeed } = await import("@/components/features/projects");

  const entry = (overrides: Partial<ProjectActivityResponse> = {}): ProjectActivityResponse => ({
    id: "a1",
    projectId: "p1",
    taskId: null,
    taskTitle: null,
    actorEmployeeId: "emp-me",
    actorName: "Me Myself",
    kind: "status_changed",
    summary: "Status changed from planning to active.",
    createdAt: "2026-06-10T00:00:00Z",
    ...overrides,
  });

  it("renders the summary the server wrote", () => {
    render(<ActivityFeed items={[entry()]} />);

    expect(screen.getByText("Status changed from planning to active.")).toBeTruthy();
    expect(screen.getByText("Status changed")).toBeTruthy();
  });

  /**
   * An escalation has no actor, because nobody did it - the clock did. Attributing it to a
   * person would be wrong, so the feed names the system instead.
   */
  it("attributes a system entry to Workeva rather than to a person", () => {
    render(
      <ActivityFeed
        items={[entry({ actorEmployeeId: null, actorName: null, kind: "task_escalated" })]}
      />,
    );

    expect(screen.getByText(/Workeva/)).toBeTruthy();
    expect(screen.getByText("Escalated")).toBeTruthy();
  });

  /**
   * A kind this build has no label for - written by a newer backend - still renders, because the
   * feed carries a written summary rather than only a key.
   */
  it("still renders an activity kind it does not recognise", () => {
    render(<ActivityFeed items={[entry({ kind: "something_new", summary: "Something happened." })]} />);

    expect(screen.getByText("Something happened.")).toBeTruthy();
    expect(screen.getByText("Activity")).toBeTruthy();
  });

  it("says so when nothing has happened", () => {
    render(<ActivityFeed items={[]} />);

    expect(screen.getByText("Nothing has happened yet")).toBeTruthy();
  });
});

// ---------- A task row on a project ----------

describe("ProjectTaskRow", async () => {
  const { ProjectTaskRow } = await import("@/components/features/projects");

  it("shows what a task carries", () => {
    render(
      <ProjectTaskRow
        task={task({ subtaskCount: 3, completedSubtaskCount: 1, commentCount: 2, checklistCount: 4, completedChecklistCount: 4 })}
        onOpen={vi.fn()}
        isOpen={false}
      />,
    );

    expect(screen.getByText("Draft the plan")).toBeTruthy();
    expect(screen.getByText(/1\/3 subtasks/)).toBeTruthy();
    expect(screen.getByText(/4\/4 steps/)).toBeTruthy();
    expect(screen.getByText(/2 comments/)).toBeTruthy();
  });

  it("marks a blocked task as blocked", () => {
    render(
      <ProjectTaskRow task={task({ isBlocked: true, blockedByCount: 2 })} onOpen={vi.fn()} isOpen={false} />,
    );

    expect(screen.getByText("Blocked by 2")).toBeTruthy();
  });

  /** A completed task reads as 100% whatever its reported progress said. */
  it("shows a completed task as fully done", () => {
    render(
      <ProjectTaskRow
        task={task({ status: TaskStatus.Completed, progressPercent: 20 })}
        onOpen={vi.fn()}
        isOpen={false}
      />,
    );

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });

  it("tells assistive technology whether its detail panel is open", async () => {
    const onOpen = vi.fn();

    const { rerender } = render(<ProjectTaskRow task={task()} onOpen={onOpen} isOpen={false} />);

    const row = screen.getByRole("button", { expanded: false });
    await userEvent.click(row);
    expect(onOpen).toHaveBeenCalled();

    rerender(<ProjectTaskRow task={task()} onOpen={onOpen} isOpen />);
    expect(screen.getByRole("button", { expanded: true })).toBeTruthy();
  });
});

// ---------- Attachments without storage ----------

describe("TaskDetailPanels", async () => {
  const { TaskDetailPanels } = await import("@/components/features/projects");

  /**
   * A deployment with no object storage is a normal state - a development machine is one - and
   * the API says so with a 503. The panel explains it rather than showing a failure, and makes
   * clear that only attachments are affected.
   */
  it("explains that attachments need storage, without failing the task", () => {
    hooks.attachments.error = new ApiError(503, {
      detail: "File storage isn't configured for this deployment.",
    });

    render(<TaskDetailPanels task={task()} siblings={[task()]} />);

    expect(screen.getByText(/File storage isn't set up/)).toBeTruthy();

    // No attach button, because there is nowhere to put a file.
    expect(screen.queryByRole("button", { name: /Attach/ })).toBeNull();

    // And the rest of the task's panels are still there.
    expect(screen.getByText("Checklist")).toBeTruthy();
    expect(screen.getByText("Comments")).toBeTruthy();
    expect(screen.getByText("Waiting for")).toBeTruthy();
  });

  it("offers an attach control when storage is available", () => {
    hooks.attachments.error = null;

    render(<TaskDetailPanels task={task()} siblings={[task()]} />);

    expect(screen.getByRole("button", { name: /Attach/ })).toBeTruthy();
  });
});
