import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Inbox, TrendingUp, User, CalendarDays, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/admin/requests", label: "Requests", icon: Inbox },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/admin/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
];

export const CLIENT_NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/plan", label: "Plan", icon: CalendarDays },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/profile", label: "Profile", icon: User },
];

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="app-shell flex items-stretch justify-between gap-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[0.68rem] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                  active && "glow-primary bg-primary text-primary-foreground",
                )}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span className="font-display text-[0.6rem] font-bold uppercase tracking-[0.14em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
