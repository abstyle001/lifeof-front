import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Target } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { MetricStat, ReportItem } from "@/lib/types";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontSize: 13,
};

function shortDate(iso: string) {
  return iso.slice(5);
}

function ReportList({
  title,
  items,
  accent,
}: {
  title: string;
  items: ReportItem[];
  accent: string;
}) {
  return (
    <div>
      <div
        className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
        style={{ color: accent }}
      >
        {title}
      </div>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.title}>
              <div className="font-medium">{item.title}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{item.detail}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">暂无</p>
      )}
    </div>
  );
}

function MetricDelta({ metric }: { metric: MetricStat }) {
  const improving = (metric.key === "stress" ? -metric.delta : metric.delta) >= 0;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{metric.label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">
        {metric.current}
        <span className="ml-0.5 text-xs text-muted-foreground">{metric.unit}</span>
      </div>
      {metric.previous ? (
        <div
          className={`mt-0.5 font-mono text-xs ${improving ? "text-[#34d399]" : "text-[#ff5c7a]"}`}
        >
          {improving ? "↑" : "↓"} {Math.abs(metric.delta_pct)}%
        </div>
      ) : (
        <div className="mt-0.5 text-xs text-muted-foreground">上月无记录</div>
      )}
    </div>
  );
}

function MonthlyReportCard() {
  const { data: report, error, loading } = useFetch(api.monthlyReport);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }
  if (error || !report) {
    return <p className="text-sm text-destructive">{error ?? "加载失败"}</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            月度报告（{shortDate(report.month_start)} ~ {shortDate(report.month_end)}）
          </h2>
          <Badge variant={report.source === "ai" ? "default" : "secondary"}>
            {report.source === "ai" ? "AI 生成" : "离线分析"}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          本月 vs 上月
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {report.stats.metrics.map((m) => (
            <MetricDelta key={m.key} metric={m} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <ReportList title="最大进步" items={report.highlights} accent="#34d399" />
        </Card>
        <Card className="p-6">
          <ReportList title="下降领域" items={report.concerns} accent="var(--destructive)" />
        </Card>
        <Card className="p-6">
          <ReportList title="改进建议" items={report.suggestions} accent="var(--primary)" />
        </Card>
      </div>

      {report.next_goal && (
        <Card className="p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span style={{ color: "var(--primary)" }}>
              <Target className="h-4 w-4" />
            </span>
            下月目标
          </div>
          <p className="font-medium">{report.next_goal}</p>
        </Card>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const { data, error, loading } = useFetch(api.dashboard);

  const studyData = useMemo(
    () => (data?.trend ?? []).map((t) => ({ date: shortDate(t.date), 学习: t.study_time })),
    [data],
  );
  const healthData = useMemo(
    () =>
      (data?.trend ?? []).map((t) => ({
        date: shortDate(t.date),
        睡眠: t.sleep,
        运动: t.exercise,
      })),
    [data],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "加载失败"}</p>;
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="font-mono text-2xl font-semibold">数据分析</h1>

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            学习时间趋势（近 30 天）
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={studyData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="学习"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            睡眠与运动趋势（近 30 天）
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={healthData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <Line type="monotone" dataKey="睡眠" stroke="#56b4e9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="运动" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <MonthlyReportCard />
      </div>
    </Page>
  );
}
