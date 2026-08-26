import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Edit3, Plus, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyRecord, RecordInput } from "@/lib/types";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function displayDate(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${iso}T00:00:00`));
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

function emptyForm(date = todayStr()): FormState {
  return {
    date,
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
}

function recordToForm(record: DailyRecord): FormState {
  return {
    date: record.date,
    study_time: String(record.study_time),
    reading_count: String(record.reading_count),
    skill_time: String(record.skill_time),
    sleep: String(record.sleep),
    exercise: String(record.exercise),
    diet: record.diet,
    mood: record.mood,
    focus: record.focus,
    stress: record.stress,
    energy: record.energy,
    tasks_completed: String(record.tasks_completed),
    tasks_total: String(record.tasks_total),
    note: record.note ?? "",
  };
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  max?: string;
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
        max={max}
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
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [records, setRecords] = useState<DailyRecord[] | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const initialRecordLoaded = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    api
      .records()
      .then((data) => {
        if (!active) return;
        setRecords(data);
        setRecordsError(null);
      })
      .catch((err: unknown) => {
        if (active) setRecordsError(err instanceof Error ? err.message : "记录加载失败");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!records || initialRecordLoaded.current) return;
    initialRecordLoaded.current = true;
    const existing = records.find((record) => record.date === form.date);
    if (existing) setForm(recordToForm(existing));
  }, [records, form.date]);

  const sortedRecords = useMemo(
    () => [...(records ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  );
  const selectedRecord = records?.find((record) => record.date === form.date) ?? null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function selectDate(date: string, scrollToForm = false) {
    const existing = records?.find((record) => record.date === date);
    setForm(existing ? recordToForm(existing) : emptyForm(date));
    setSaved(false);
    setError(null);
    if (scrollToForm) {
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const tasksCompleted = Number(form.tasks_completed) || 0;
    const tasksTotal = Number(form.tasks_total) || 0;
    if (tasksCompleted > tasksTotal) {
      setError("已完成任务数不能大于总任务数");
      return;
    }
    if (form.note.length > 500) {
      setError("备注不能超过 500 个字符");
      return;
    }

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
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      note: form.note.trim() || null,
    };
    try {
      const savedRecord = await api.upsertRecord(payload);
      setRecords((current) => {
        const withoutSavedDate = (current ?? []).filter(
          (record) => record.date !== savedRecord.date,
        );
        return [...withoutSavedDate, savedRecord];
      });
      setForm(recordToForm(savedRecord));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRecord(record: DailyRecord) {
    if (
      !window.confirm(`确定删除 ${displayDate(record.date)} 的记录吗？删除后经验和等级会重新计算。`)
    ) {
      return;
    }

    setDeletingId(record.id);
    setError(null);
    try {
      await api.deleteRecord(record.id);
      setRecords((current) => (current ?? []).filter((item) => item.id !== record.id));
      if (form.date === record.date) setForm(emptyForm(record.date));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-mono text-2xl font-semibold">每日记录</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              选择日期可新增或编辑记录，保存后会重新计算属性、经验与成就。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => selectDate(todayStr(), true)}>
            <Plus />
            填写今天
          </Button>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form ref={formRef} onSubmit={onSubmit} className="scroll-mt-20 space-y-4">
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="w-full max-w-xs space-y-1.5">
                  <Label htmlFor="date">日期</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => selectDate(e.target.value)}
                    required
                  />
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1 font-mono text-xs",
                    selectedRecord
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {selectedRecord ? "正在编辑已有记录" : "新记录"}
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
                  max="24"
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
                  max="24"
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
                  max="24"
                />
                <NumberField
                  label="运动时长"
                  unit="小时"
                  value={form.exercise}
                  onChange={(v) => set("exercise", v)}
                  step="0.5"
                  max="24"
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
                任务与备注
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
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="note">备注（可选）</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {form.note.length}/500
                  </span>
                </div>
                <textarea
                  id="note"
                  value={form.note}
                  maxLength={500}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="今天想记下的一句话"
                  rows={4}
                  className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
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
              {submitting ? "保存中…" : selectedRecord ? "更新记录" : "保存记录"}
            </Button>
          </form>

          <aside className="xl:sticky xl:top-20">
            <Card className="overflow-hidden">
              <div className="border-b border-border p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-mono text-sm font-semibold">记录历史</h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {records?.length ?? 0} 天
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  点击编辑会将完整数据回填到表单。
                </p>
              </div>

              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
                {!records && !recordsError && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">正在加载…</p>
                )}
                {recordsError && (
                  <p className="px-2 py-4 text-sm text-destructive">{recordsError}</p>
                )}
                {records && records.length === 0 && (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    还没有记录，从今天开始打卡吧。
                  </p>
                )}
                {sortedRecords.map((record) => (
                  <div
                    key={record.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      form.date === record.date
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-secondary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => selectDate(record.date, true)}
                      >
                        <div className="font-mono text-sm font-medium">
                          {displayDate(record.date)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          学习 {record.study_time}h · 睡眠 {record.sleep}h · 运动 {record.exercise}h
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          任务 {record.tasks_completed}/{record.tasks_total} · 心情 {record.mood}/10
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="编辑记录"
                          aria-label={`编辑 ${record.date} 的记录`}
                          onClick={() => selectDate(record.date, true)}
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="删除记录"
                          aria-label={`删除 ${record.date} 的记录`}
                          disabled={deletingId === record.id}
                          onClick={() => void deleteRecord(record)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </Page>
  );
}
