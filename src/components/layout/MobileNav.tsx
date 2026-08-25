import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function MobileNav() {
  return (
    <nav className="flex items-center gap-1 md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
              isActive && "bg-secondary text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          <span className="sr-only">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
