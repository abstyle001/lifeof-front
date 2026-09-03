import { BookOpen, CalendarDays, Clock, Dumbbell } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { AttributePanel } from "@/components/dashboard/AttributePanel";
import { AttributeRadar } from "@/components/dashboard/AttributeRadar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TodayStatusCard } from "@/components/dashboard/TodayStatusCard";
import { UserCard } from "@/components/dashboard/UserCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

export function DashboardPage() {
  const { data, error, loading } = useFetch(api.dashboard);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "加载失败"}</p>;
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl space-y-6">
        <UserCard user={data.user} streak={data.streak} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="打卡天数"
            value={String(data.total_days)}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StatCard
            label="学习时长"
            value={`${data.total_study_hours}h`}
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label="运动时长"
            value={`${data.total_exercise_hours}h`}
            icon={<Dumbbell className="h-4 w-4" />}
          />
          <StatCard
            label="累计阅读"
            value={`${data.total_reading_hours}h`}
            icon={<BookOpen className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              属性雷达
            </h3>
            <AttributeRadar attributes={data.attributes} />
          </Card>
          <div className="lg:col-span-3">
            <AttributePanel attributes={data.attributes} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayStatusCard today={data.today} />
          <Card className="p-6">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              最近记录
            </h3>
            {data.recent_records.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有记录。</p>
            ) : (
              <ul className="space-y-2">
                {data.recent_records.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground">{r.date}</span>
                    <span className="text-muted-foreground">
                      学习 {r.study_time}h · 睡眠 {r.sleep}h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
