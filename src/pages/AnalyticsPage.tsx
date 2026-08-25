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
import { TrendingDown, TrendingUp } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { TrendPoint } from "@/lib/types";

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

interface Delta {
  label: string;
  before: number;
  after: number;
}

interface Report {
  improved?: Delta;
  declined?: Delta;
}

function pctChange(d: Delta) {
  return d.before === 0 ? 0 : ((d.after - d.before) / d.before) * 100;
}

function buildReport(trend: TrendPoint[]): Report | null {
  if (trend.length < 14) return null;
  const mid = Math.floor(trend.length / 2);
  const first = trend.slice(0, mid);
  const second = trend.slice(mid);
  const avg = (arr: TrendPoint[], key: "study_time" | "sleep" | "exercise") =>
    arr.reduce((s, t) => s + t[key], 0) / arr.length;

  const deltas: Delta[] = [
    { label: "学习时间", before: avg(first, "study_time"), after: avg(second, "study_time") },
    { label: "睡眠时长", before: avg(first, "sleep"), after: avg(second, "sleep") },
    { label: "运动时长", before: avg(first, "exercise"), after: avg(second, "exercise") },
  ];
  const improved = [...deltas]
    .filter((d) => d.after > d.before)
    .sort((a, b) => pctChange(b) - pctChange(a))[0];
  const declined = [...deltas]
    .filter((d) => d.after < d.before)
    .sort((a, b) => pctChange(a) - pctChange(b))[0];
  return { improved, declined };
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

  const report = buildReport(data.trend);

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

        <Card className="p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            月度报告
          </h2>
          {report ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.improved && (
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#34d399]" />
                  <div>
                    <div className="text-sm text-muted-foreground">最大进步领域</div>
                    <div className="font-medium">{report.improved.label}</div>
                    <div className="font-mono text-sm text-[#34d399]">
                      +{pctChange(report.improved).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
              {report.declined && (
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5c7a]" />
                  <div>
                    <div className="text-sm text-muted-foreground">下降领域</div>
                    <div className="font-medium">{report.declined.label}</div>
                    <div className="font-mono text-sm text-[#ff5c7a]">
                      {pctChange(report.declined).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {report.improved && report.declined
                  ? `建议：优先改善「${report.declined.label}」，保持「${report.improved.label}」的良好势头。`
                  : report.declined
                    ? `建议：优先改善「${report.declined.label}」。`
                    : report.improved
                      ? `继续保持「${report.improved.label}」的良好势头。`
                      : "各项指标保持平稳，继续保持。"}
                更多 AI 分析将在后续版本上线。
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              数据还不够，记录满两周后可生成月度报告。
            </p>
          )}
        </Card>
      </div>
    </Page>
  );
}
