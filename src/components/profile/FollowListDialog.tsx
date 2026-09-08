import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { FollowListKind, FollowUser } from "@/lib/types";

function MiniAvatar({ user }: { user: Pick<FollowUser, "username" | "avatar"> }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className="h-10 w-10 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-sm font-bold text-primary-foreground">
      {user.username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

interface FollowListDialogProps {
  username: string;
  kind: FollowListKind;
  count: number;
  trigger: ReactNode;
}

export function FollowListDialog({ username, kind, count, trigger }: FollowListDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FollowUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setItems(null);
    setError(null);
    api
      .followList(username, kind)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "加载失败");
      });
    return () => {
      active = false;
    };
  }, [open, username, kind]);

  const title = kind === "following" ? "关注" : "粉丝";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="sm" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title} · {count}
          </DialogTitle>
          <DialogDescription>
            {username} 的{title}列表，点击可查看对方公开档案。
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {items === null && !error && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          )}

          {error && <p className="py-6 text-center text-sm text-destructive">{error}</p>}

          {items && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <UserRound className="h-7 w-7" />
              <span className="text-sm">还没有{title}。</span>
            </div>
          )}

          {items?.map((user) => (
            <button
              key={user.username}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                setOpen(false);
                void navigate(`/profiles/${encodeURIComponent(user.username)}`);
              }}
            >
              <MiniAvatar user={user} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.username}</span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                  LV. {user.level} · 经验 {user.experience}
                </span>
              </span>
              <span className="font-mono text-xs text-primary">查看 →</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
