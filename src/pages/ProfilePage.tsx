import { useState } from "react";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { User, UserUpdateInput } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

function xpProgress(experience: number, level: number) {
  const base = (level - 1) * (level - 1) * 100;
  const threshold = level * level * 100;
  return Math.min(100, Math.round(((experience - base) / (threshold - base)) * 100));
}

function UserAvatar({ user, className }: { user: User; className?: string }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={`h-16 w-16 rounded-2xl object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-2xl font-bold text-primary-foreground ${className ?? ""}`}
    >
      {user.username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function EditProfileDialog({
  user,
  onSaved,
  onUserUpdated,
}: {
  user: User;
  onSaved: () => void;
  onUserUpdated: (next: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setUsername(user.username);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }

  async function handleSave() {
    const payload: UserUpdateInput = {};

    const name = username.trim();
    if (name !== user.username) {
      if (name.length < 3 || name.length > 50) {
        setError("用户名长度需为 3–50 个字符");
        return;
      }
      payload.username = name;
    }

    if (oldPassword || newPassword || confirmPassword) {
      if (!oldPassword) {
        setError("请输入当前密码");
        return;
      }
      if (newPassword.length < 6) {
        setError("新密码长度至少 6 位");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("两次输入的新密码不一致");
        return;
      }
      payload.old_password = oldPassword;
      payload.new_password = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateMe(payload);
      setOpen(false);
      onUserUpdated(updated);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          修改资料
        </Button>
      </DialogTrigger>
      <DialogContent size="sm" className="left-1/2 top-1/2 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>修改资料</DialogTitle>
          <DialogDescription>更新用户名与头像；如需重置密码，请填写下方密码栏。</DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <AvatarUploader user={user} onUploaded={onUserUpdated} />

          <div className="space-y-1.5">
            <label htmlFor="profile-username" className="text-xs text-muted-foreground">
              用户名
            </label>
            <Input
              id="profile-username"
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              重置密码（可选）
            </p>
            <div className="space-y-1.5">
              <label htmlFor="old-password" className="text-xs text-muted-foreground">
                当前密码
              </label>
              <Input
                id="old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs text-muted-foreground">
                新密码（至少 6 位）
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                确认新密码
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfilePage() {
  const { data, error, loading, reload } = useFetch(api.dashboard);
  const { user: authUser, setUser } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "加载失败"}</p>;
  }

  const user = authUser ?? data.user;
  const progress = xpProgress(user.experience, user.level);

  const rows = [
    { label: "打卡天数", value: `${data.total_days} 天` },
    { label: "累计学习", value: `${data.total_study_hours} 小时` },
    { label: "累计运动", value: `${data.total_exercise_hours} 小时` },
    { label: "累计阅读", value: `${data.books_read} 本` },
    { label: "当前等级", value: `LV. ${user.level}` },
    { label: "累计经验", value: `${user.experience}` },
  ];

  return (
    <Page>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-mono text-2xl font-semibold">我的</h1>

        <Card className="flex items-center gap-5 p-6">
          <UserAvatar user={user} />
          <div className="flex-1">
            <div className="text-lg font-semibold">{user.username}</div>
            <div className="font-mono text-sm text-muted-foreground">
              第 {user.level} 级 · 经验 {user.experience}
            </div>
            <Progress value={progress} className="mt-3" />
          </div>
          <EditProfileDialog user={user} onSaved={reload} onUserUpdated={setUser} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            累计数据
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="font-mono text-lg font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            关于 LifeOS
          </h2>
          <p className="text-sm text-muted-foreground">
            LifeOS 是个人数据可视化人生仪表盘：记录每天的学习、健康、情绪与任务， 转化为 RPG
            属性、等级经验和成就，帮助你看清自己的成长状态。
          </p>
        </Card>
      </div>
    </Page>
  );
}
