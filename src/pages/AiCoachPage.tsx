import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  Lightbulb,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Page } from "@/components/layout/Page";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ChatMessage, ReportItem, WeeklyReport, WeeklyStats } from "@/lib/types";

function shortDate(iso: string) {
  return iso.slice(5);
}

function Generating() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="animate-pulse">AI 正在生成中，请稍候…</span>
    </div>
  );
}

function ReportList({
  title,
  items,
  icon,
  accent,
}: {
  title: string;
  items: ReportItem[];
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>
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
    </Card>
  );
}

function MetricsCard({ stats }: { stats: WeeklyStats }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        本周 vs 上周
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.metrics.map((m) => {
          const improving = (m.key === "stress" ? -m.delta : m.delta) >= 0;
          return (
            <div key={m.key} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="mt-1 font-mono text-lg font-semibold">
                {m.current}
                <span className="ml-0.5 text-xs text-muted-foreground">{m.unit}</span>
              </div>
              {m.previous ? (
                <div
                  className={`mt-0.5 font-mono text-xs ${
                    improving ? "text-[#34d399]" : "text-[#ff5c7a]"
                  }`}
                >
                  {improving ? "↑" : "↓"} {Math.abs(m.delta_pct)}%
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-muted-foreground">上周无记录</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await api.chat(next);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="flex h-[32rem] flex-col">
      <div className="border-b px-6 py-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          与 AI 对话
        </h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            你好，我是你的 AI
            教练。可以问我关于睡眠、学习、运动或情绪的问题，我会根据你的数据给出建议。
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] whitespace-pre-wrap rounded-lg bg-primary/10 px-3 py-2 text-sm"
                : "mr-auto max-w-[80%] whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2 text-sm"
            }
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="mr-auto max-w-[80%] rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
            思考中…
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2 border-t p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="问点什么，比如：最近睡眠怎么样？"
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !input.trim()}>
          <Send />
          发送
        </Button>
      </div>
    </Card>
  );
}

export function AiCoachPage() {
  const { data: statsData, error: statsError, loading: statsLoading } = useFetch(api.weeklyStats);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    setReportLoading(true);
    setReportError(null);
    api
      .weeklyReport(refreshTick > 0)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch((e) => {
        if (active) setReportError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const handleRegenerate = () => setRefreshTick((t) => t + 1);

  return (
    <Page>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-semibold">AI 教练</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {statsData
                ? `${shortDate(statsData.week_start)} ~ ${shortDate(statsData.week_end)}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                reportLoading ? "secondary" : report?.source === "ai" ? "default" : "secondary"
              }
            >
              {reportLoading ? "生成中" : report?.source === "ai" ? "AI 生成" : "离线分析"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={reportLoading}>
              <RefreshCw />
              重新生成
            </Button>
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : statsData ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="连续打卡"
                value={`${statsData.stats.streak} 天`}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <StatCard
                label="当前等级"
                value={`LV.${statsData.stats.level}`}
                icon={<Trophy className="h-4 w-4" />}
              />
              <StatCard
                label="本周记录"
                value={`${statsData.stats.days_recorded}/7 天`}
                icon={<Clock className="h-4 w-4" />}
              />
              <StatCard
                label="累计经验"
                value={String(statsData.stats.experience)}
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>
            <MetricsCard stats={statsData.stats} />
          </>
        ) : (
          <p className="text-sm text-destructive">{statsError ?? "加载失败"}</p>
        )}

        {reportLoading ? (
          <Card className="p-6">
            <Generating />
          </Card>
        ) : reportError ? (
          <p className="text-sm text-destructive">{reportError}</p>
        ) : report ? (
          <>
            <Card className="p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                本周总结
              </h2>
              <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ReportList
                title="亮点"
                items={report.highlights}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="#34d399"
              />
              <ReportList
                title="问题"
                items={report.concerns}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="var(--destructive)"
              />
              <ReportList
                title="建议"
                items={report.suggestions}
                icon={<Lightbulb className="h-4 w-4" />}
                accent="var(--primary)"
              />
            </div>

            {report.next_goal && (
              <Card className="p-6">
                <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <span style={{ color: "var(--primary)" }}>
                    <Target className="h-4 w-4" />
                  </span>
                  下周目标
                </div>
                <p className="font-medium">{report.next_goal}</p>
              </Card>
            )}
          </>
        ) : null}

        <ChatPanel />
      </div>
    </Page>
  );
}
