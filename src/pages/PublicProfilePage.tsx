import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Page } from "@/components/layout/Page";
import { AttributePanel } from "@/components/dashboard/AttributePanel";
import { AttributeRadar } from "@/components/dashboard/AttributeRadar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PublicProfile } from "@/lib/types";

function xpProgress(experience: number, level: number) {
  const base = (level - 1) * (level - 1) * 100;
  const threshold = level * level * 100;
  return Math.min(100, Math.round(((experience - base) / (threshold - base)) * 100));
}

function ProfileAvatar({ profile }: { profile: PublicProfile }) {
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={profile.username}
        className="h-20 w-20 rounded-2xl object-cover"
      />
    );
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-3xl font-bold text-primary-foreground">
      {profile.username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function PublicProfilePage() {
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const username = routeUsername ? decodeURIComponent(routeUsername) : "";
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setProfile(null);
    if (!username) {
      setLoading(false);
      setError("用户不存在或不可见");
      return () => {
        active = false;
      };
    }

    api
      .publicProfile(username)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "加载档案失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-36 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    const unavailable = error?.includes("不存在") || error?.includes("不可见") || !profile;
    return (
      <Page>
        <div className="mx-auto max-w-2xl space-y-4">
          <Button variant="ghost" onClick={() => void navigate("/discover")}>
            <ArrowLeft className="h-4 w-4" />
            返回发现
          </Button>
          <Card className="p-8 text-center">
            <p className="text-sm text-destructive">
              {unavailable ? "用户不存在或已设为私密。" : (error ?? "加载档案失败。")}
            </p>
            {!unavailable && (
              <Button className="mt-4" onClick={() => window.location.reload()}>
                重试
              </Button>
            )}
          </Card>
        </div>
      </Page>
    );
  }

  const progress = xpProgress(profile.experience, profile.level);

  return (
    <Page>
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={() => void navigate("/discover")}>
          <ArrowLeft className="h-4 w-4" />
          返回发现
        </Button>

        <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <ProfileAvatar profile={profile} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{profile.username}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              第 {profile.level} 级 · 经验 {profile.experience}
            </p>
            <Progress value={progress} className="mt-4" />
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            公开成长档案
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="p-6 lg:col-span-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              属性雷达
            </h2>
            <AttributeRadar attributes={profile.attributes} />
          </Card>
          <div className="lg:col-span-3">
            <AttributePanel attributes={profile.attributes} />
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              已解锁成就
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {profile.achievements.length} 项
            </span>
          </div>
          {profile.achievements.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LockKeyhole className="h-4 w-4" />
              还没有公开的成就记录。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile.achievements.map((achievement) => (
                <div
                  key={achievement.code}
                  className="flex items-start gap-3 rounded-lg border border-border p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#34d399]" />
                  <div className="min-w-0">
                    <div className="font-medium">{achievement.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
