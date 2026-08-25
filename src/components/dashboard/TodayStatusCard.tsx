import { ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TodayStatus } from "@/lib/types";

export function TodayStatusCard({ today }: { today: TodayStatus | null }) {
  if (!today) {
    return (
      <Card className="p-6">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          今日状态
        </h3>
        <p className="mt-4 text-sm text-muted-foreground">今天还没有记录，去「记录」页打卡吧。</p>
      </Card>
    );
  }

  const taskProgress = today.tasks_total
    ? Math.round((today.tasks_completed / today.tasks_total) * 100)
    : 0;

  return (
    <Card className="p-6">
      <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">今日状态</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-5xl font-bold leading-none text-primary">
          {today.score}
        </span>
        <span className="font-mono text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
        <ListTodo className="h-4 w-4" />
        <span>
          任务 {today.tasks_completed}/{today.tasks_total}
        </span>
      </div>
      <Progress value={taskProgress} className="mt-2" />
    </Card>
  );
}
