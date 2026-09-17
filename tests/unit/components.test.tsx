import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api";
import { AttendanceStatus, TaskPriority, TaskStatus, type MyAttendanceTodayResponse, type TaskResponse } from "@/lib/types";

// ---------- shared mocks ----------

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

const session = { me: { active: { employeeId: "emp-me" } }, can: vi.fn(() => true) };
vi.mock("@/components/session-provider", () => ({ useSession: () => session }));

const hooks = {
  today: { data: undefined as MyAttendanceTodayResponse | undefined, isLoading: false, error: null, refetch: vi.fn() },
  clockIn: { mutateAsync: vi.fn(), isPending: false },
  clockOut: { mutateAsync: vi.fn(), isPending: false },
  createLeave: { mutateAsync: vi.fn(), isPending: false },
  updateTask: { mutateAsync: vi.fn(), isPending: false },
};

vi.mock("@/hooks/use-workeva", () => ({
  useAttendanceToday: () => hooks.today,
  useClockIn: () => hooks.clockIn,
  useClockOut: () => hooks.clockOut,
  useLeaveTypes: () => ({ data: [{ id: "annual", name: "Annual Leave" }] }),
  useCreateLeaveRequest: () => hooks.createLeave,
  useUpdateTaskStatus: () => hooks.updateTask,
  useCancelLeave: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDecideLeave: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDepartments: () => ({ data: [] }),
  useEmployees: () => ({ data: { items: [] } }),
  useSaveTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const requestLocation = vi.fn();
vi.mock("@/lib/utils", async (original) => {
  const actual = await original<typeof import("@/lib/utils")>();
  return { ...actual, requestLocation: () => requestLocation() };
});

function today(overrides: Partial<MyAttendanceTodayResponse> = {}): MyAttendanceTodayResponse {
  return {
    workDate: "2026-09-17", status: AttendanceStatus.NotCheckedIn, clockInAt: null, clockOutAt: null,
    clockInLocationName: null, isLate: false, lateMinutes: 0, workedMinutes: null, canClockIn: true,
    canClockOut: false, blockedReason: null, locationRequired: true, timezone: "Africa/Lagos",
    workDayStart: "08:00:00", workDayEnd: "17:00:00", gracePeriodMinutes: 15, isWorkingDay: true, locations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.today.data = today();
});

// ---------- Attendance state rendering ----------

describe("ClockCard", async () => {
  const { ClockCard } = await import("@/components/features/clock-card");

  it("offers clock-in and explains that location is checked only on tap", () => {
    render(<ClockCard />);
    expect(screen.getByRole("button", { name: "Clock in" })).toBeTruthy();
    expect(screen.getByText(/isn't tracked/i)).toBeTruthy();
  });

  it("shows the reason instead of a button when clocking in is blocked", () => {
    hooks.today.data = today({ canClockIn: false, blockedReason: "You're on approved leave today." });
    render(<ClockCard />);
    expect(screen.queryByRole("button", { name: "Clock in" })).toBeNull();
    expect(screen.getByText("You're on approved leave today.")).toBeTruthy();
  });

  it("never calls the API when location permission is denied, and says what to do", async () => {
    const { LocationError } = await import("@/lib/utils");
    requestLocation.mockRejectedValue(new LocationError("Allow location access in your browser settings and try again.", "denied"));

    render(<ClockCard />);
    await userEvent.click(screen.getByRole("button", { name: "Clock in" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringMatching(/Allow location access/));
    expect(hooks.clockIn.mutateAsync).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("does not claim success when the server refuses the clock-in", async () => {
    requestLocation.mockResolvedValue({ latitude: 6.5, longitude: 3.4, accuracyMeters: 10 });
    hooks.clockIn.mutateAsync.mockRejectedValue(
      new ApiError(422, { detail: "You're outside the allowed work location. You're about 3.1 km from Head Office." }));

    render(<ClockCard />);
    await userEvent.click(screen.getByRole("button", { name: "Clock in" }));

    expect(await screen.findByText(/outside the allowed work location/)).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
    expect(hooks.today.refetch).toHaveBeenCalled();
  });

  it("sends only raw coordinates and reports success after the server confirms", async () => {
    requestLocation.mockResolvedValue({ latitude: 6.5, longitude: 3.4, accuracyMeters: 10 });
    hooks.clockIn.mutateAsync.mockResolvedValue({ clockInAt: "2026-09-17T07:05:00Z", clockInLocationName: "Head Office" });

    render(<ClockCard />);
    await userEvent.click(screen.getByRole("button", { name: "Clock in" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Attendance recorded", expect.stringContaining("Head Office")));
    expect(hooks.clockIn.mutateAsync).toHaveBeenCalledWith({ latitude: 6.5, longitude: 3.4, accuracyMeters: 10 });
  });

  it("skips the location prompt when the company does not require location", async () => {
    hooks.today.data = today({ locationRequired: false });
    hooks.clockIn.mutateAsync.mockResolvedValue({ clockInAt: "2026-09-17T07:05:00Z", clockInLocationName: null });

    render(<ClockCard />);
    await userEvent.click(screen.getByRole("button", { name: "Clock in" }));

    await waitFor(() => expect(hooks.clockIn.mutateAsync).toHaveBeenCalledWith({ latitude: null, longitude: null, accuracyMeters: null }));
    expect(requestLocation).not.toHaveBeenCalled();
  });
});

// ---------- Leave form validation ----------

describe("LeaveRequestDialog", async () => {
  const { LeaveRequestDialog } = await import("@/components/features/shared");

  it("blocks an end date before the start date without calling the API", async () => {
    render(<LeaveRequestDialog open onClose={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText(/Leave type/), "annual");
    const start = screen.getByLabelText(/First day/) as HTMLInputElement;
    const end = screen.getByLabelText(/Last day/) as HTMLInputElement;
    await userEvent.clear(start);
    await userEvent.type(start, "2026-10-20");
    await userEvent.clear(end);
    await userEvent.type(end, "2026-10-10");
    await userEvent.type(screen.getByLabelText(/Reason/), "Trip");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("The end date can't be before the start date.")).toBeTruthy();
    expect(hooks.createLeave.mutateAsync).not.toHaveBeenCalled();
  });

  it("requires a leave type and a reason", async () => {
    render(<LeaveRequestDialog open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Choose a leave type.")).toBeTruthy();
    expect(screen.getByText("Tell your manager why you need this leave.")).toBeTruthy();
    expect(hooks.createLeave.mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps what was typed and shows the server's field error when the API refuses", async () => {
    hooks.createLeave.mutateAsync.mockRejectedValue(new ApiError(422, {
      detail: "You have 2 day(s) of Annual Leave left, and this request is for 5.",
    }));

    render(<LeaveRequestDialog open onClose={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/Leave type/), "annual");
    await userEvent.type(screen.getByLabelText(/Reason/), "Holiday");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText(/day\(s\) of Annual Leave left/)).toBeTruthy();
    expect((screen.getByLabelText(/Reason/) as HTMLTextAreaElement).value).toBe("Holiday");
  });
});

// ---------- Task status behaviour ----------

describe("TaskList", async () => {
  const { TaskList } = await import("@/components/features/shared");

  const task = (overrides: Partial<TaskResponse> = {}): TaskResponse => ({
    id: "t1", title: "Prepare report", description: null, createdByEmployeeId: "mgr", createdByName: "Manager",
    assigneeEmployeeId: "emp-me", assigneeName: "Me", assigneePhotoUrl: null, departmentId: null, departmentName: null,
    priority: TaskPriority.High, status: TaskStatus.ToDo, dueDate: "2026-09-10", isOverdue: true, completedAt: null,
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...overrides,
  });

  it("lets the assignee start and then complete their task", async () => {
    hooks.updateTask.mutateAsync.mockResolvedValue({});
    const { rerender } = render(<TaskList tasks={[task()]} />);

    expect(screen.getByText("Overdue")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(hooks.updateTask.mutateAsync).toHaveBeenCalledWith({ id: "t1", status: TaskStatus.InProgress });

    rerender(<TaskList tasks={[task({ status: TaskStatus.InProgress })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect(hooks.updateTask.mutateAsync).toHaveBeenLastCalledWith({ id: "t1", status: TaskStatus.Completed });
  });

  it("offers no status button on someone else's task or a finished task", () => {
    render(<TaskList tasks={[task({ id: "a", assigneeEmployeeId: "someone-else" }), task({ id: "b", status: TaskStatus.Completed })]} />);
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
  });

  it("reports a refused update rather than failing silently", async () => {
    hooks.updateTask.mutateAsync.mockRejectedValue(new ApiError(409, { detail: "A cancelled task can't be moved to in-progress." }));
    render(<TaskList tasks={[task()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update the task", "A cancelled task can't be moved to in-progress."));
  });
});
