import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useSession, homeForRole, type AppRole } from "@/hooks/useSession";
import { useNotifications } from "@/lib/queries";
import { BottomNav, ADMIN_NAV, CLIENT_NAV } from "./BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell({
  area,
  title,
  subtitle,
  action,
  children,
  hideNav,
}: {
  /** Which side of the CRM this screen belongs to. Redirects users of the other role. */
  area: AppRole;
  title?: string;
  subtitle?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}) {
  const { loading, session, role, roleLoading, user } = useSession();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications(user?.id);
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", search: { next: undefined, role: undefined }, replace: true });
      return;
    }
    if (session && !roleLoading && role && role !== area) {
      navigate({ to: homeForRole(role), replace: true });
    }
  }, [loading, session, role, roleLoading, area, navigate]);

  if (loading || !session || roleLoading || role !== area) {
    return (
      <div className="app-shell space-y-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const notifTo = area === "admin" ? "/admin/notifications" : "/app/notifications";

  return (
    <div className="min-h-screen bg-background">
      {title && (
        <header className="app-shell pt-9 pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{area === "admin" ? "Coach Console" : "My Training"}</p>
              <h1 className="display-xl mt-2 text-[1.85rem]">{title}</h1>
              {subtitle && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {action}
              <Link
                to={notifTo}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-display text-[0.6rem] font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </div>
          </div>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-primary/70 via-border to-transparent" />
        </header>
      )}
      <main className="app-shell pad-bottom-nav">{children}</main>
      {!hideNav && <BottomNav items={area === "admin" ? ADMIN_NAV : CLIENT_NAV} />}
    </div>
  );
}
