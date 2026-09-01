import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { User } from "@/lib/types";

function xpProgress(experience: number, level: number) {
  const base = (level - 1) * (level - 1) * 100;
  const threshold = level * level * 100;
  const span = threshold - base;
  return Math.min(100, Math.max(0, Math.round(((experience - base) / span) * 100)));
}

function xpToNext(experience: number, level: number) {
  return Math.max(0, level * level * 100 - experience);
}

export function UserCard({ user, streak }: { user: User; streak: number }) {
  const progress = xpProgress(user.experience, user.level);
  const remaining = xpToNext(user.experience, user.level);

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-2xl font-bold text-primary-foreground">
              {user.username[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{user.username}</div>
            <div className="font-mono text-sm text-muted-foreground">
              人生玩家 · 第 {user.level} 级
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            等级
          </div>
          <div className="font-mono text-4xl font-bold leading-none text-primary">{user.level}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>经验 {user.experience}</span>
          <span>距升级 {remaining}</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-sm">
        <Flame className="h-4 w-4 text-[#fbbf24]" />
        <span className="font-semibold text-foreground">{streak}</span>
        <span className="text-muted-foreground">天连续打卡</span>
      </div>
    </Card>
  );
}
