"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import { postJson, issueMessage } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import type { Notification } from "@/lib/types/domain";
import { relativeTime } from "@/lib/money/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { AccountScreen } from "@/components/account/account-shell";

export default function NotificationsPage() {
  const { toast } = useToast();
  const notifications = useApi<Notification[]>("/api/notifications");
  const [marking, setMarking] = React.useState(false);
  const items = notifications.data ?? [];

  async function markAll() {
    setMarking(true);
    try {
      await postJson("/api/notifications");
      await notifications.refetch({ quiet: true });
      toast({ title: "Notifications marked as read", variant: "success" });
    } catch (error) {
      toast({ title: "Could not update", description: issueMessage(error), variant: "error" });
    } finally {
      setMarking(false);
    }
  }

  return (
    <AccountScreen
      title="Notifications"
      action={<Bell className="size-5 text-muted-2" />}
      demo={false}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          {items.filter((item) => !item.read).length} unread
        </p>
        <Button variant="ghost" size="sm" onClick={markAll} loading={marking} disabled={items.length === 0}>
          <CheckCheck className="size-3.5" /> Mark all read
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        {notifications.loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-[11.5px] text-muted">No notifications yet.</p>
        ) : (
          items.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  notification.read ? "bg-line-strong" : "bg-accent"
                }`}
                aria-label={notification.read ? "Read" : "Unread"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-fg">{notification.title}</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-muted">{notification.body}</p>
              </div>
              <span className="shrink-0 text-[9.5px] text-muted-2">
                {relativeTime(notification.createdAt)}
              </span>
            </div>
          ))
        )}
      </section>

      <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-[10.5px] leading-4 text-muted">
        Notifications in this build are seeded demo records. No push or email provider is connected.
      </div>
    </AccountScreen>
  );
}
