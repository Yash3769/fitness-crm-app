import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NotificationsList } from "@/components/NotificationsList";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Coach Console" },
      { name: "description", content: "New client requests, completed workouts and progress updates." },
      { property: "og:title", content: "Notifications — Coach Console" },
      { property: "og:description", content: "Stay on top of client activity." },
    ],
  }),
  component: AdminNotificationsPage,
});

function AdminNotificationsPage() {
  const { user } = useSession();
  return (
    <AppShell area="admin" title="Notifications" subtitle="Requests, completed workouts and progress updates.">
      <NotificationsList userId={user?.id} />
    </AppShell>
  );
}
