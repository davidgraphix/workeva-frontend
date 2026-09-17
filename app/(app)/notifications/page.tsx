"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, CheckCheck, ClipboardList, Clock, Info } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surfaces";
import { Pagination } from "@/components/ui/data-table";
import { EmptyState, QueryBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-workeva";
import { formatAgo } from "@/lib/format";
import { NotificationCategory, type NotificationResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const icons: Record<NotificationCategory, typeof Bell> = {
  [NotificationCategory.Attendance]: Clock,
  [NotificationCategory.Leave]: CalendarDays,
  [NotificationCategory.Task]: ClipboardList,
  [NotificationCategory.System]: Info,
};

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useNotifications(page, unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  async function open(notification: NotificationResponse) {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.linkPath?.startsWith("/")) router.push(notification.linkPath);
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <>
            <Button variant="secondary" size="sm" aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}>
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={markAll.isPending}
              onClick={async () => {
                const result = await markAll.mutateAsync();
                toast.success(result.updated > 0 ? `Marked ${result.updated} as read` : "You're all caught up");
              }}
            >
              <CheckCheck aria-hidden className="size-4" /> Mark all read
            </Button>
          </>
        }
      />

      <Card>
        <QueryBoundary
          isLoading={notifications.isLoading}
          error={notifications.error}
          data={notifications.data}
          onRetry={() => notifications.refetch()}
          isEmpty={(d) => d.items.length === 0}
          emptyState={<EmptyState icon={<Bell aria-hidden className="size-5" />} title="You're all caught up" description="New notifications about attendance, leave and tasks will appear here." />}
        >
          {(data) => (
            <>
              <ul className="divide-y divide-slate-100">
                {data.items.map((n) => {
                  const Icon = icons[n.category];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:px-5", !n.isRead && "bg-brand-50/40")}
                      >
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm", n.isRead ? "text-slate-700" : "font-semibold text-slate-900")}>{n.title}</span>
                          <span className="block text-sm text-slate-500">{n.body}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{formatAgo(n.createdAt)}</span>
                        </span>
                        {!n.isRead && (
                          <>
                            <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" />
                            <span className="sr-only">Unread</span>
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Pagination {...data} onPageChange={setPage} />
            </>
          )}
        </QueryBoundary>
      </Card>
    </>
  );
}
