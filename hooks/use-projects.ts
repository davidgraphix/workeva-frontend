"use client";

import { query } from "@/lib/api";
import { queryKeys, useApiMutation, useApiQuery } from "./use-api";
import type {
  AttachmentDownloadResponse,
  AttachmentUploadTicketResponse,
  ChecklistItemResponse,
  EscalationRuleResponse,
  EscalationTarget,
  PagedResult,
  ProjectActivityResponse,
  ProjectDashboardResponse,
  ProjectMemberResponse,
  ProjectMemberRole,
  ProjectResponse,
  ProjectStatus,
  TaskAttachmentResponse,
  TaskCommentResponse,
  TaskDependencyResponse,
  TaskPriority,
} from "@/lib/types";

/**
 * Projects and advanced work management.
 *
 * The same conventions as the rest of the app: query keys carry the organization so switching
 * companies cannot show cached data from the previous one, mutations declare what they
 * invalidate, and nothing here decides authorization. The API does that; these calls surface
 * what it returns, including its refusals.
 *
 * Every endpoint behind these hooks answers 404 when the organization does not have the
 * `projects_and_work` feature, so a 404 from the list query is the normal "not enabled here"
 * answer rather than a bug - which is why the pages below treat it as a state to render rather
 * than an error to retry.
 */

// ---------- Projects ----------

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  priority?: TaskPriority;
  ownerEmployeeId?: string;
  departmentId?: string;
  branchId?: string;
  teamId?: string;
  includeArchived?: boolean;
  onlyMine?: boolean;
  onlyOverdue?: boolean;
  onlyAtRisk?: boolean;
  page?: number;
  pageSize?: number;
}

export const useProjects = (filters: ProjectFilters = {}) =>
  useApiQuery<PagedResult<ProjectResponse>>(
    queryKeys.projects(filters),
    `/api/v2/projects${query(filters as Record<string, string | number | boolean | undefined>)}`,
    // Keeping the previous page while the next loads stops the table collapsing to a skeleton
    // on every filter keystroke.
    { placeholderData: (previous) => previous },
  );

export const useProject = (id: string) =>
  useApiQuery<ProjectResponse>(queryKeys.project(id), `/api/v2/projects/${id}`, {
    enabled: Boolean(id),
  });

export const useProjectDashboard = () =>
  useApiQuery<ProjectDashboardResponse>(queryKeys.projectDashboard(), "/api/v2/projects/dashboard");

export interface SaveProjectBody {
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  ownerEmployeeId: string;
  managerEmployeeId: string | null;
  departmentId: string | null;
  branchId: string | null;
  teamId: string | null;
}

export const useSaveProject = () =>
  useApiMutation<ProjectResponse, { id?: string; body: SaveProjectBody }>(
    (request, { id, body }) =>
      request<ProjectResponse>(id ? `/api/v2/projects/${id}` : "/api/v2/projects", {
        method: id ? "PUT" : "POST",
        body,
      }),
    { invalidates: [["projects"], ["project"], ["project-dashboard"]] },
  );

export const useSetProjectStatus = () =>
  useApiMutation<ProjectResponse, { id: string; status: ProjectStatus }>(
    (request, { id, status }) =>
      request<ProjectResponse>(`/api/v2/projects/${id}/status`, { method: "PUT", body: { status } }),
    { invalidates: [["projects"], ["project"], ["project-dashboard"], ["project-activity"]] },
  );

export const useSetProjectArchived = () =>
  useApiMutation<ProjectResponse, { id: string; isArchived: boolean }>(
    (request, { id, isArchived }) =>
      request<ProjectResponse>(`/api/v2/projects/${id}/archive`, { method: "PUT", body: { isArchived } }),
    { invalidates: [["projects"], ["project"], ["project-dashboard"], ["project-activity"]] },
  );

// ---------- Members ----------

export const useProjectMembers = (projectId: string, includeInactive = false) =>
  useApiQuery<ProjectMemberResponse[]>(
    queryKeys.projectMembers(`${projectId}-${includeInactive}`),
    `/api/v2/projects/${projectId}/members${query({ includeInactive })}`,
    { enabled: Boolean(projectId) },
  );

export const useAddProjectMember = () =>
  useApiMutation<ProjectMemberResponse, { projectId: string; employeeId: string; role: ProjectMemberRole }>(
    (request, { projectId, employeeId, role }) =>
      request<ProjectMemberResponse>(`/api/v2/projects/${projectId}/members`, {
        method: "POST",
        body: { employeeId, role },
      }),
    { invalidates: [["project-members"], ["project"], ["projects"]] },
  );

export const useRemoveProjectMember = () =>
  useApiMutation<void, { projectId: string; employeeId: string }>(
    (request, { projectId, employeeId }) =>
      request<void>(`/api/v2/projects/${projectId}/members/${employeeId}`, { method: "DELETE" }),
    { invalidates: [["project-members"], ["project"], ["projects"]] },
  );

// ---------- Activity ----------

export const useProjectActivity = (projectId: string, page = 1, pageSize = 25) =>
  useApiQuery<PagedResult<ProjectActivityResponse>>(
    queryKeys.projectActivity(`${projectId}-${page}-${pageSize}`),
    `/api/v2/projects/${projectId}/activity${query({ page, pageSize })}`,
    { enabled: Boolean(projectId) },
  );

export const useTaskActivity = (taskId: string) =>
  useApiQuery<ProjectActivityResponse[]>(
    queryKeys.taskActivity(taskId),
    `/api/v2/tasks/${taskId}/activity`,
    { enabled: Boolean(taskId) },
  );

// ---------- Checklist ----------

export const useTaskChecklist = (taskId: string) =>
  useApiQuery<ChecklistItemResponse[]>(
    queryKeys.taskChecklist(taskId),
    `/api/v2/tasks/${taskId}/checklist`,
    { enabled: Boolean(taskId) },
  );

export const useAddChecklistItem = () =>
  useApiMutation<ChecklistItemResponse, { taskId: string; title: string }>(
    (request, { taskId, title }) =>
      request<ChecklistItemResponse>(`/api/v2/tasks/${taskId}/checklist`, {
        method: "POST",
        body: { title },
      }),
    { invalidates: [["task-checklist"], ["tasks"], ["task"]] },
  );

export const useSetChecklistItemDone = () =>
  useApiMutation<ChecklistItemResponse, { taskId: string; itemId: string; isDone: boolean }>(
    (request, { taskId, itemId, isDone }) =>
      request<ChecklistItemResponse>(`/api/v2/tasks/${taskId}/checklist/${itemId}`, {
        method: "PUT",
        body: { isDone },
      }),
    { invalidates: [["task-checklist"], ["tasks"], ["task"]] },
  );

export const useRemoveChecklistItem = () =>
  useApiMutation<void, { taskId: string; itemId: string }>(
    (request, { taskId, itemId }) =>
      request<void>(`/api/v2/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" }),
    { invalidates: [["task-checklist"], ["tasks"], ["task"]] },
  );

// ---------- Comments ----------

export const useTaskComments = (taskId: string) =>
  useApiQuery<TaskCommentResponse[]>(
    queryKeys.taskComments(taskId),
    `/api/v2/tasks/${taskId}/comments`,
    { enabled: Boolean(taskId) },
  );

export const useAddTaskComment = () =>
  useApiMutation<TaskCommentResponse, { taskId: string; body: string }>(
    (request, { taskId, body }) =>
      request<TaskCommentResponse>(`/api/v2/tasks/${taskId}/comments`, {
        method: "POST",
        body: { body },
      }),
    { invalidates: [["task-comments"], ["task-activity"], ["tasks"], ["task"]] },
  );

export const useUpdateTaskComment = () =>
  useApiMutation<TaskCommentResponse, { taskId: string; commentId: string; body: string }>(
    (request, { taskId, commentId, body }) =>
      request<TaskCommentResponse>(`/api/v2/tasks/${taskId}/comments/${commentId}`, {
        method: "PUT",
        body: { body },
      }),
    { invalidates: [["task-comments"]] },
  );

export const useRemoveTaskComment = () =>
  useApiMutation<void, { taskId: string; commentId: string }>(
    (request, { taskId, commentId }) =>
      request<void>(`/api/v2/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" }),
    { invalidates: [["task-comments"], ["tasks"], ["task"]] },
  );

// ---------- Dependencies ----------

export const useTaskDependencies = (taskId: string) =>
  useApiQuery<TaskDependencyResponse[]>(
    queryKeys.taskDependencies(taskId),
    `/api/v2/tasks/${taskId}/dependencies`,
    { enabled: Boolean(taskId) },
  );

export const useAddTaskDependency = () =>
  useApiMutation<TaskDependencyResponse, { taskId: string; dependsOnTaskId: string }>(
    (request, { taskId, dependsOnTaskId }) =>
      request<TaskDependencyResponse>(`/api/v2/tasks/${taskId}/dependencies`, {
        method: "POST",
        body: { dependsOnTaskId },
      }),
    { invalidates: [["task-dependencies"], ["tasks"], ["task"], ["task-activity"]] },
  );

export const useRemoveTaskDependency = () =>
  useApiMutation<void, { taskId: string; dependencyId: string }>(
    (request, { taskId, dependencyId }) =>
      request<void>(`/api/v2/tasks/${taskId}/dependencies/${dependencyId}`, { method: "DELETE" }),
    { invalidates: [["task-dependencies"], ["tasks"], ["task"]] },
  );

// ---------- Attachments ----------

export const useTaskAttachments = (taskId: string) =>
  useApiQuery<TaskAttachmentResponse[]>(
    queryKeys.taskAttachments(taskId),
    `/api/v2/tasks/${taskId}/attachments`,
    { enabled: Boolean(taskId) },
  );

/**
 * Uploads a file in the three steps the API's design requires.
 *
 * The bytes go straight from the browser to object storage - never through the API - so this
 * asks for a signed ticket, PUTs to it, then confirms. The confirmation is what makes the
 * attachment visible: an upload abandoned halfway leaves a pending row rather than an attachment
 * that looks present and is not there.
 *
 * `fetch` is used directly for the middle step, and only there, because the ticket's URL belongs
 * to the storage provider rather than to the Workeva API - sending our Authorization header to
 * it would be sending our token somewhere it does not belong.
 */
export const useUploadTaskAttachment = () =>
  useApiMutation<TaskAttachmentResponse, { taskId: string; file: File }>(
    async (request, { taskId, file }) => {
      const ticket = await request<AttachmentUploadTicketResponse>(
        `/api/v2/tasks/${taskId}/attachments`,
        {
          method: "POST",
          body: { fileName: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size },
        },
      );

      const uploaded = await fetch(ticket.uploadUrl, {
        method: ticket.method,
        headers: ticket.headers,
        body: file,
      });

      if (!uploaded.ok) {
        throw new Error("The file couldn't be uploaded. Please try again.");
      }

      return request<TaskAttachmentResponse>(
        `/api/v2/tasks/${taskId}/attachments/${ticket.attachmentId}`,
        { method: "PUT" },
      );
    },
    { invalidates: [["task-attachments"], ["tasks"], ["task"], ["task-activity"]] },
  );

/**
 * Fetches a short-lived signed URL for one download.
 *
 * A mutation rather than a query on purpose: it is not idempotent in any useful sense - each
 * call mints a new expiring credential - and caching one would mean handing out a URL after it
 * had expired.
 */
export const useTaskAttachmentDownload = () =>
  useApiMutation<AttachmentDownloadResponse, { taskId: string; attachmentId: string }>(
    (request, { taskId, attachmentId }) =>
      request<AttachmentDownloadResponse>(
        `/api/v2/tasks/${taskId}/attachments/${attachmentId}/download`,
      ),
  );

export const useRemoveTaskAttachment = () =>
  useApiMutation<void, { taskId: string; attachmentId: string }>(
    (request, { taskId, attachmentId }) =>
      request<void>(`/api/v2/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" }),
    { invalidates: [["task-attachments"], ["tasks"], ["task"]] },
  );

// ---------- Escalation ----------

export const useEscalationRules = () =>
  useApiQuery<EscalationRuleResponse[]>(queryKeys.escalationRules(), "/api/v2/escalation-rules");

export interface SaveEscalationRuleBody {
  daysOverdue: number;
  target: EscalationTarget;
  targetRoleKey: string | null;
  isActive: boolean;
}

export const useSaveEscalationRule = () =>
  useApiMutation<EscalationRuleResponse, { id?: string; body: SaveEscalationRuleBody }>(
    (request, { id, body }) =>
      request<EscalationRuleResponse>(
        id ? `/api/v2/escalation-rules/${id}` : "/api/v2/escalation-rules",
        { method: id ? "PUT" : "POST", body },
      ),
    { invalidates: [["escalation-rules"]] },
  );

export const useRemoveEscalationRule = () =>
  useApiMutation<void, { id: string }>(
    (request, { id }) => request<void>(`/api/v2/escalation-rules/${id}`, { method: "DELETE" }),
    { invalidates: [["escalation-rules"]] },
  );
