import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotificationCategory, type NotificationResponse } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const markRead = { mutate: vi.fn() };
const markAll = { mutateAsync: vi.fn(async () => ({ updated: 1 })), isPending: false };
let items: NotificationResponse[] = [];

vi.mock("@/hooks/use-workeva", () => ({
  useNotifications: () => ({
    isLoading: false, error: null, refetch: vi.fn(),
    data: { items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1, hasNextPage: false },
  }),
  useMarkNotificationRead: () => markRead,
  useMarkAllNotificationsRead: () => markAll,
}));

const notification = (overrides: Partial<NotificationResponse>): NotificationResponse => ({
  id: "n1", category: NotificationCategory.Leave, title: "Your leave request was approved", body: "22 Sep to 23 Sep",
  linkPath: "/my-leave", isRead: false, createdAt: new Date().toISOString(), ...overrides,
});

describe("Notifications page", async () => {
  const { default: NotificationsPage } = await import("@/app/(app)/notifications/page");

  beforeEach(() => vi.clearAllMocks());

  it("marks an unread notification read and follows its in-app link", async () => {
    items = [notification({})];
    render(<NotificationsPage />);

    expect(screen.getByText("Unread")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Your leave request was approved/ }));

    expect(markRead.mutate).toHaveBeenCalledWith("n1");
    expect(push).toHaveBeenCalledWith("/my-leave");
  });

  it("does not re-mark a read notification, and ignores off-site links", async () => {
    items = [notification({ id: "n2", isRead: true, linkPath: "https://evil.example" })];
    render(<NotificationsPage />);

    await userEvent.click(screen.getByRole("button", { name: /Your leave request was approved/ }));

    expect(markRead.mutate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a helpful empty state", () => {
    items = [];
    render(<NotificationsPage />);
    expect(screen.getByText("You're all caught up")).toBeTruthy();
  });

  it("marks everything read in one action", async () => {
    items = [notification({})];
    render(<NotificationsPage />);
    await userEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    expect(markAll.mutateAsync).toHaveBeenCalled();
  });
});
