import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NotificationsList } from "@/components/NotificationsList";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — My Training" },
      { name: "description", content: "Updates from your coach about plans, requests and your account." },
      { property: "og:title", content: "Notifications — My Training" },
      { property: "og:description", content: "Never miss an update from your coach." },
    ],
  }),
  component: ClientNotificationsPage,
});

function ClientNotificationsPage() {
  const { user } = useSession();
  return (
    <AppShell area="client" title="Notifications" subtitle="Updates from your coach.">
      <NotificationsList userId={user?.id} />
    </AppShell>
  );
}
