import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { RecordInput } from "@/lib/types";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface FormState {
  date: string;
  study_time: string;
  reading_count: string;
  skill_time: string;
  sleep: string;
  exercise: string;
  diet: number;
  mood: number;
  focus: number;
  stress: number;
  energy: number;
  tasks_completed: string;
  tasks_total: string;
  note: string;
}

const initialForm: FormState = {
  date: todayStr(),
  study_time: "0",
  reading_count: "0",
  skill_time: "0",
  sleep: "7",
  exercise: "0",
  diet: 7,
  mood: 7,
  focus: 7,
  stress: 4,
  energy: 7,
  tasks_completed: "0",
  tasks_total: "5",
  note: "",
};

function NumberField({
  label,
  unit,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {unit ? <span className="ml-1 text-xs text-muted-foreground">{unit}</span> : null}
      </Label>
      <Input
        type="number"
        step={step ?? "1"}
        min={min ?? "0"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ScoreField({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}

export function RecordPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload: RecordInput = {
      date: form.date,
      sleep: Number(form.sleep) || 0,
      study_time: Number(form.study_time) || 0,
      exercise: Number(form.exercise) || 0,
      mood: form.mood,
      focus: form.focus,
      reading_count: Number(form.reading_count) || 0,
      skill_time: Number(form.skill_time) || 0,
      diet: form.diet,
      stress: form.stress,
      energy: form.energy,
      tasks_completed: Number(form.tasks_completed) || 0,
      tasks_total: Number(form.tasks_total) || 0,
      note: form.note || null,
    };
    try {
      await api.upsertRecord(payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-mono text-2xl font-semibold">每日记录</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              学习
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField
                label="学习时间"
                unit="小时"
                value={form.study_time}
                onChange={(v) => set("study_time", v)}
                step="0.5"
              />
              <NumberField
                label="阅读数量"
                unit="本"
                value={form.reading_count}
                onChange={(v) => set("reading_count", v)}
              />
              <NumberField
                label="技能练习"
                unit="小时"
                value={form.skill_time}
                onChange={(v) => set("skill_time", v)}
                step="0.5"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              健康
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField
                label="睡眠时长"
                unit="小时"
                value={form.sleep}
                onChange={(v) => set("sleep", v)}
                step="0.5"
              />
              <NumberField
                label="运动时长"
                unit="小时"
                value={form.exercise}
                onChange={(v) => set("exercise", v)}
                step="0.5"
              />
              <ScoreField
                label="饮食情况"
                value={form.diet}
                onChange={(v) => set("diet", v)}
                color="#34d399"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              状态
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScoreField
                label="心情评分"
                value={form.mood}
                onChange={(v) => set("mood", v)}
                color="#f472b6"
              />
              <ScoreField
                label="专注评分"
                value={form.focus}
                onChange={(v) => set("focus", v)}
                color="#fbbf24"
              />
              <ScoreField
                label="压力评分"
                value={form.stress}
                onChange={(v) => set("stress", v)}
                color="#ff5c7a"
              />
              <ScoreField
                label="精力评分"
                value={form.energy}
                onChange={(v) => set("energy", v)}
                color="#56b4e9"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              任务
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="已完成"
                value={form.tasks_completed}
                onChange={(v) => set("tasks_completed", v)}
              />
              <NumberField
                label="总任务"
                value={form.tasks_total}
                onChange={(v) => set("tasks_total", v)}
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="note">备注（可选）</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="今天想记下的一句话"
              />
            </div>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <p className="flex items-center gap-2 text-sm text-[#34d399]">
              <CheckCircle2 className="h-4 w-4" />
              已保存，属性与经验已更新
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? "保存中…" : "保存记录"}
          </Button>
        </form>
      </div>
    </Page>
  );
}
