import { Page } from "@/components/layout/Page";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

function xpProgress(experience: number, level: number) {
  const base = (level - 1) * (level - 1) * 100;
  const threshold = level * level * 100;
  return Math.min(100, Math.round(((experience - base) / (threshold - base)) * 100));
}

export function ProfilePage() {
  const { data, error, loading } = useFetch(api.dashboard);

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

  const { user } = data;
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-2xl font-bold text-primary-foreground">
            {user.username[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold">{user.username}</div>
            <div className="font-mono text-sm text-muted-foreground">
              第 {user.level} 级 · 经验 {user.experience}
            </div>
            <Progress value={progress} className="mt-3" />
          </div>
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
