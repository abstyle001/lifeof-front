import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUnread } from "@/lib/unreadStore";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./nav";

function NavBadge({ item }: { item: NavItem }) {
  const { totalUnread } = useUnread();
  if (item.badge !== "unread" || totalUnread <= 0) return null;
  const label = totalUnread > 99 ? "99+" : String(totalUnread);
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 font-mono text-[10px] font-bold text-white">
      {label}
    </span>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 px-4 py-6 backdrop-blur md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            {user?.username?.[0]?.toUpperCase() ?? "L"}
          </span>
        )}
        <span className="font-mono text-lg font-semibold tracking-tight">LifeOS</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive && "bg-secondary text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <NavBadge item={item} />
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 font-mono text-sm font-bold text-primary">
            {user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user?.username}</div>
          <div className="font-mono text-xs text-muted-foreground">LV. {user?.level ?? 1}</div>
        </div>
      </div>
    </aside>
  );
}
