import { NavLink } from "react-router-dom";
import { useUnread } from "@/lib/unreadStore";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./nav";

function MobileBadge({ item }: { item: NavItem }) {
  const { totalUnread } = useUnread();
  if (item.badge !== "unread" || totalUnread <= 0) return null;
  const label = totalUnread > 99 ? "99+" : String(totalUnread);
  return (
    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9px] font-bold leading-none text-white">
      {label}
    </span>
  );
}

export function MobileNav() {
  return (
    <nav className="flex items-center gap-1 md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
              isActive && "bg-secondary text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          <span className="sr-only">{item.label}</span>
          <MobileBadge item={item} />
        </NavLink>
      ))}
    </nav>
  );
}
