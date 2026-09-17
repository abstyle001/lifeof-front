import { useCallback, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ATTR_KEYS, ATTR_META } from "@/lib/attributes";
import { api } from "@/lib/api";
import type {
  AttributeExplanation,
  AttributeFactor,
  AttributeKey,
  Attributes,
  AttributesExplain,
} from "@/lib/types";

type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AttributesExplain };

export function AttributePanel({ attributes }: { attributes: Attributes }) {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AttributeKey | null>(null);
  const [explain, setExplain] = useState<ExplainState>({ status: "idle" });

  const loadExplain = useCallback(async () => {
    if (explain.status === "ready" || explain.status === "loading") return;
    setExplain({ status: "loading" });
    try {
      const data = await api.attributesExplain();
      setExplain({ status: "ready", data });
    } catch (error) {
      setExplain({
        status: "error",
        message: error instanceof Error ? error.message : "加载失败",
      });
    }
  }, [explain.status]);

  const openExplain = (key: AttributeKey) => {
    setSelectedKey(key);
    setOpen(true);
    void loadExplain();
  };

  const selected =
    explain.status === "ready"
      ? (explain.data.attributes.find((a) => a.key === selectedKey) ?? null)
      : null;
  const explainMeta = selectedKey ? ATTR_META[selectedKey] : null;

  return (
    <>
      <Card className="p-6">
        <h3 className="mb-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          属性面板
        </h3>
        <div className="space-y-5">
          {ATTR_KEYS.map((key) => {
            const meta = ATTR_META[key];
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    <span className="font-mono font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {meta.zh} · {meta.desc}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold">{attributes[key]}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      aria-label={`查看${meta.label}计算方式`}
                      title="查看计算方式"
                      onClick={() => openExplain(key)}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
                <Progress
                  value={attributes[key]}
                  indicatorStyle={{ backgroundColor: meta.color }}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
          {explain.status === "loading" && (
            <p className="text-sm text-muted-foreground">正在计算属性来源…</p>
          )}
          {explain.status === "error" && (
            <p className="text-sm text-destructive">{explain.message}</p>
          )}
          {explain.status === "ready" && explainMeta && selected && (
            <ExplainContent
              attr={selected}
              metaColor={explainMeta.color}
              windowDays={explain.data.window_days}
              recordCount={explain.data.record_count}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExplainContent({
  attr,
  metaColor,
  windowDays,
  recordCount,
}: {
  attr: AttributeExplanation;
  metaColor: string;
  windowDays: number;
  recordCount: number;
}) {
  const raw = attr.base + attr.factors.reduce((sum, f) => sum + f.contribution, 0);
  const clamped = raw > 100;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="font-mono" style={{ color: metaColor }}>
            {attr.label}
          </span>
          <span className="ml-2">{attr.zh}</span>
        </DialogTitle>
        <DialogDescription>
          基于最近 {windowDays} 天内的 {recordCount} 条记录计算
          {attr.key === "CHA" && attr.source === "social" && " · 真实社交数据"}
          {attr.key === "CHA" && attr.source === "proxy" && " · 无社交记录，暂用情绪代理"}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex items-end gap-3">
        <span className="font-mono text-5xl font-bold leading-none" style={{ color: metaColor }}>
          {attr.value}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
        {attr.key === "CHA" && attr.source === "social" && (
          <Badge className="mb-1.5">社交数据</Badge>
        )}
        {attr.key === "CHA" && attr.source === "proxy" && (
          <Badge variant="outline" className="mb-1.5">
            情绪代理
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>基线 {attr.base}</span>
          <span>
            原始合计 {raw.toFixed(1)}
            {clamped && <span className="ml-2 text-amber-500">已超过上限，截断为 100</span>}
          </span>
        </div>
        <Progress value={attr.value} indicatorStyle={{ backgroundColor: metaColor }} />
      </div>

      {attr.factors.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{attr.note}</p>
      ) : (
        <>
          <div className="mt-5 space-y-2">
            {attr.factors.map((factor) => (
              <FactorRow key={`${factor.key}-${factor.kind}`} factor={factor} />
            ))}
          </div>
          {attr.note && (
            <p className="mt-5 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
              {attr.note}
            </p>
          )}
        </>
      )}
    </>
  );
}

function FactorRow({ factor }: { factor: AttributeFactor }) {
  const zero = factor.contribution === 0;
  const positive = factor.contribution > 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {factor.detail ?? `${factor.label} × ${factor.weight ?? ""}`}
      </span>
      <span
        className={`shrink-0 font-mono text-sm font-semibold ${
          zero ? "text-muted-foreground" : positive ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {positive ? "+" : ""}
        {factor.contribution.toFixed(1)}
      </span>
    </div>
  );
}
