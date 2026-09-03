import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MobileNav } from "./MobileNav";

export function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    void navigate("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 px-4 sm:px-6 lg:px-10">
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">
          L
        </span>
        <span className="font-mono text-sm font-semibold">LifeOS</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <MobileNav />
        <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4" />
          退出
        </Button>
      </div>
    </header>
  );
}
