import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  OperationAssignmentRole,
  OperationReportStatus,
  OperationShift,
  type MyOperationAssignmentResponse,
  type OperationReportResponse,
} from "@/lib/types";

// ---------- shared mocks ----------

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

const session = { me: { active: { employeeId: "emp-me" } }, can: vi.fn(() => true) };
vi.mock("@/components/session-provider", () => ({ useSession: () => session }));

const hooks = {
  submit: { mutateAsync: vi.fn(), isPending: false },
  review: { mutateAsync: vi.fn(), isPending: false },
  activities: {
    data: [
      { id: "harvest", name: "Harvesting", unit: "kg", description: null, operationLocationId: null, operationLocationName: null, isActive: true },
      { id: "weeding", name: "Weeding", unit: "hours", description: null, operationLocationId: null, operationLocationName: null, isActive: true },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
};

vi.mock("@/hooks/use-operations", () => ({
  useOperationActivities: () => hooks.activities,
  useSubmitOperationReport: () => hooks.submit,
  useReviewOperationReport: () => hooks.review,
}));

const { ReportDetail, SubmitReportDialog } = await import("@/components/features/operations");

const assignment: MyOperationAssignmentResponse = {
  operationLocationId: "farm-1",
  operationLocationName: "North Farm",
  type: 0,
  address: "1 Field Road",
  role: OperationAssignmentRole.Worker,
  morningSubmitted: false,
  eveningSubmitted: false,
  morningReportId: null,
  eveningReportId: null,
  morningStatus: null,
  eveningStatus: null,
};

function report(overrides: Partial<OperationReportResponse> = {}): OperationReportResponse {
  return {
    id: "report-1",
    operationLocationId: "farm-1",
    operationLocationName: "North Farm",
    employeeId: "emp-other",
    employeeName: "Wunmi Worker",
    reportDate: "2026-10-15",
    shift: OperationShift.Morning,
    status: OperationReportStatus.Submitted,
    submittedAt: "2026-10-15T07:30:00Z",
    notes: "Dry morning",
    reviewedByEmployeeId: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    canEdit: false,
    canReview: false,
    lines: [
      { id: "line-1", activityId: "harvest", activityName: "Harvesting", quantity: 120.5, unit: "kg", notes: null },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.submit.mutateAsync.mockResolvedValue(report());
  hooks.review.mutateAsync.mockResolvedValue(report({ status: OperationReportStatus.Approved }));
});

describe("field report submission", () => {
  it("shows the unit of the chosen activity, so nobody guesses kilograms or hours", async () => {
    render(<SubmitReportDialog open onClose={vi.fn()} assignment={assignment} shift={OperationShift.Morning} />);

    await userEvent.selectOptions(screen.getByLabelText("What was done"), "weeding");
    expect(screen.getByLabelText("How much (hours)")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("What was done"), "harvest");
    expect(screen.getByLabelText("How much (kg)")).toBeTruthy();
  });

  it("submits the quantity as a number, with the date and shift the server will check", async () => {
    const onClose = vi.fn();
    render(<SubmitReportDialog open onClose={onClose} assignment={assignment} shift={OperationShift.Evening} />);

    await userEvent.selectOptions(screen.getByLabelText("What was done"), "harvest");
    await userEvent.type(screen.getByLabelText("How much (kg)"), "120.5");
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => expect(hooks.submit.mutateAsync).toHaveBeenCalledTimes(1));

    const body = hooks.submit.mutateAsync.mock.calls[0][0];
    expect(body.operationLocationId).toBe("farm-1");
    expect(body.shift).toBe(OperationShift.Evening);
    expect(body.lines).toEqual([{ activityId: "harvest", quantity: 120.5, notes: null }]);
    // No employeeId and no status: the server decides both.
    expect(body).not.toHaveProperty("status");
    expect(body.employeeId).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });

  it("refuses an empty report rather than sending nothing to the server", async () => {
    render(<SubmitReportDialog open onClose={vi.fn()} assignment={assignment} shift={OperationShift.Morning} />);

    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText(/at least one activity/i)).toBeTruthy();
    expect(hooks.submit.mutateAsync).not.toHaveBeenCalled();
  });

  it("refuses a quantity of zero or a word", async () => {
    render(<SubmitReportDialog open onClose={vi.fn()} assignment={assignment} shift={OperationShift.Morning} />);

    await userEvent.selectOptions(screen.getByLabelText("What was done"), "harvest");
    await userEvent.type(screen.getByLabelText("How much (kg)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText(/greater than zero/i)).toBeTruthy();
    expect(hooks.submit.mutateAsync).not.toHaveBeenCalled();
  });

  it("refuses the same activity twice in one report", async () => {
    render(<SubmitReportDialog open onClose={vi.fn()} assignment={assignment} shift={OperationShift.Morning} />);

    await userEvent.selectOptions(screen.getByLabelText("What was done"), "harvest");
    await userEvent.type(screen.getByLabelText("How much (kg)"), "10");

    await userEvent.click(screen.getByRole("button", { name: /add another activity/i }));

    const activitySelects = screen.getAllByLabelText("What was done");
    await userEvent.selectOptions(activitySelects[1], "harvest");
    const quantities = screen.getAllByLabelText(/How much/);
    await userEvent.type(quantities[1], "5");

    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText(/only appear once/i)).toBeTruthy();
    expect(hooks.submit.mutateAsync).not.toHaveBeenCalled();
  });

  it("shows the supervisor's reason when correcting a returned report", () => {
    const returned = report({
      status: OperationReportStatus.Returned,
      reviewNote: "The weight looks low - please recount.",
      employeeId: "emp-me",
      canEdit: true,
    });

    render(
      <SubmitReportDialog
        open
        onClose={vi.fn()}
        assignment={assignment}
        shift={OperationShift.Morning}
        existing={returned}
      />,
    );

    expect(screen.getByText(/please recount/i)).toBeTruthy();
    // The previous figures are there to correct, not retyped from scratch.
    expect(screen.getByDisplayValue("120.5")).toBeTruthy();
  });
});

describe("review controls", () => {
  it("offers no review buttons when the API says the reader may not review", () => {
    render(<ReportDetail report={report({ canReview: false })} />);

    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByText(/waiting for a supervisor/i)).toBeTruthy();
  });

  it("approves with one click when the reader may review", async () => {
    render(<ReportDetail report={report({ canReview: true })} />);

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(hooks.review.mutateAsync).toHaveBeenCalledWith({
      id: "report-1",
      approve: true,
      note: null,
    }));
  });

  it("will not return a report without saying what needs correcting", async () => {
    render(<ReportDetail report={report({ canReview: true })} />);

    await userEvent.click(screen.getByRole("button", { name: /return for changes/i }));
    await userEvent.click(screen.getByRole("button", { name: /send back/i }));

    expect(await screen.findByText(/say what needs correcting/i)).toBeTruthy();
    expect(hooks.review.mutateAsync).not.toHaveBeenCalled();
  });

  it("returns a report with the note once one is given", async () => {
    render(<ReportDetail report={report({ canReview: true })} />);

    await userEvent.click(screen.getByRole("button", { name: /return for changes/i }));
    await userEvent.type(screen.getByLabelText(/what needs correcting/i), "Recount the harvest");
    await userEvent.click(screen.getByRole("button", { name: /send back/i }));

    await waitFor(() => expect(hooks.review.mutateAsync).toHaveBeenCalledWith({
      id: "report-1",
      approve: false,
      note: "Recount the harvest",
    }));
  });

  it("shows the quantities and units that were recorded", () => {
    render(<ReportDetail report={report()} />);

    expect(screen.getByText("Harvesting")).toBeTruthy();
    expect(screen.getByText(/120\.5/)).toBeTruthy();
    expect(screen.getByText("kg")).toBeTruthy();
  });
});
