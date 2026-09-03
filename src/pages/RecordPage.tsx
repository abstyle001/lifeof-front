import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Edit3, Plus, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chips, type ChipOption } from "@/components/record/Chips";
import { ScoreButtons, type ScoreOption } from "@/components/record/ScoreButtons";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyRecord, RecordInput, SocialInput, SocialInteraction, Task } from "@/lib/types";

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

// 时长档位（小时）：没做 / <30分钟 / 约1小时 / 2小时左右 / 3小时+
const DURATION_OPTIONS: ChipOption[] = [
  { value: 0, label: "没做" },
  { value: 0.5, label: "<30分钟" },
  { value: 1, label: "约1小时" },
  { value: 2, label: "2小时左右" },
  { value: 3, label: "3小时+" },
];

// 社交互动频率（映射到 interactions 字段）
const FREQUENCY_OPTIONS: ChipOption[] = [
  { value: 0, label: "无" },
  { value: 2, label: "少量" },
  { value: 4, label: "一些" },
  { value: 6, label: "很多" },
];

const MOOD_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "😞", label: "很差" },
  { value: 3, emoji: "😕", label: "较差" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "🙂", label: "不错" },
  { value: 10, emoji: "😄", label: "很好" },
];

const FOCUS_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "🌀", label: "走神" },
  { value: 3, emoji: "😕", label: "分心" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "🎯", label: "专注" },
  { value: 10, emoji: "🔥", label: "心流" },
];

// 压力反向：越低越轻松
const STRESS_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "😌", label: "轻松" },
  { value: 3, emoji: "🙂", label: "适中" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "😥", label: "偏大" },
  { value: 10, emoji: "😫", label: "很大" },
];

const ENERGY_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "🪫", label: "疲惫" },
  { value: 3, emoji: "😕", label: "较低" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "🙂", label: "充沛" },
  { value: 10, emoji: "⚡", label: "很足" },
];

const DIET_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "🍔", label: "很差" },
  { value: 3, emoji: "😕", label: "较差" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "🙂", label: "不错" },
  { value: 10, emoji: "🥗", label: "健康" },
];

const QUALITY_OPTIONS: ScoreOption[] = [
  { value: 0, emoji: "😞", label: "很差" },
  { value: 3, emoji: "😕", label: "较差" },
  { value: 5, emoji: "😐", label: "一般" },
  { value: 7, emoji: "🙂", label: "不错" },
  { value: 10, emoji: "😄", label: "很好" },
];

const IMPORTANCE_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

type Importance = (typeof IMPORTANCE_OPTIONS)[number]["value"];

const DURATIONS = [0, 0.5, 1, 2, 3];
const SCORES = [0, 3, 5, 7, 10];
const FREQUENCIES = [0, 2, 4, 6];

function snap(value: number, buckets: number[]): number {
  return buckets.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
}

interface FormState {
  date: string;
  study_time: number;
  skill_time: number;
  reading_time: number;
  exercise: number;
  sleep: string;
  mood: number;
  focus: number;
  stress: number;
  energy: number;
  diet: number;
  social_interactions: number;
  social_quality: number;
  note: string;
}

function emptyForm(date = todayStr()): FormState {
  return {
    date,
    study_time: 0,
    skill_time: 0,
    reading_time: 0,
    exercise: 0,
    sleep: "7",
    mood: 5,
    focus: 5,
    stress: 5,
    energy: 5,
    diet: 5,
    social_interactions: 0,
    social_quality: 5,
    note: "",
  };
}

function recordToForm(record: DailyRecord): FormState {
  return {
    date: record.date,
    study_time: snap(record.study_time, DURATIONS),
    skill_time: snap(record.skill_time, DURATIONS),
    reading_time: snap(record.reading_time, DURATIONS),
    exercise: snap(record.exercise, DURATIONS),
    sleep: String(record.sleep),
    mood: snap(record.mood, SCORES),
    focus: snap(record.focus, SCORES),
    stress: snap(record.stress, SCORES),
    energy: snap(record.energy, SCORES),
    diet: snap(record.diet, SCORES),
    social_interactions: 0,
    social_quality: 5,
    note: record.note ?? "",
  };
}

function withSocial(form: FormState, social?: SocialInteraction): FormState {
  if (!social) return form;
  return {
    ...form,
    social_interactions: snap(social.interactions, FREQUENCIES),
    social_quality: snap(social.quality, SCORES),
  };
}

export function RecordPage() {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [records, setRecords] = useState<DailyRecord[] | null>(null);
  const [socials, setSocials] = useState<SocialInteraction[] | null>(null);
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [deletedTaskIds, setDeletedTaskIds] = useState<number[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const initializedRef = useRef(false);
  const tempIdRef = useRef(-1);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.records(), api.social(), api.tasks()])
      .then(([r, s, t]) => {
        if (!active) return;
        setRecords(r);
        setSocials(s);
        setAllTasks(t);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "记录加载失败");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (records === null || socials === null || allTasks === null || initializedRef.current) return;
    initializedRef.current = true;
    const existing = records.find((r) => r.date === form.date);
    const social = socials.find((s) => s.date === form.date);
    setForm(withSocial(existing ? recordToForm(existing) : emptyForm(form.date), social));
  }, [records, socials, allTasks, form.date]);

  const sortedRecords = useMemo(
    () => [...(records ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  );
  const selectedRecord = records?.find((r) => r.date === form.date) ?? null;
  const dayTasks = useMemo(
    () => (allTasks ?? []).filter((t) => t.date === form.date),
    [allTasks, form.date],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((cur) => ({ ...cur, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function selectDate(date: string, scrollToForm = false) {
    const existing = records?.find((r) => r.date === date);
    const social = socials?.find((s) => s.date === date);
    setForm(withSocial(existing ? recordToForm(existing) : emptyForm(date), social));
    setDeletedTaskIds([]);
    setNewTaskTitle("");
    setSaved(false);
    setError(null);
    if (scrollToForm) {
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    const task: Task = {
      id: tempIdRef.current--,
      date: form.date,
      title,
      done: false,
      importance: "medium",
    };
    setAllTasks((cur) => [...(cur ?? []), task]);
    setNewTaskTitle("");
    setSaved(false);
  }

  function toggleTask(id: number) {
    setAllTasks((cur) => (cur ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    setSaved(false);
  }

  function setTaskImportance(id: number, importance: Importance) {
    setAllTasks((cur) => (cur ?? []).map((t) => (t.id === id ? { ...t, importance } : t)));
    setSaved(false);
  }

  function removeTask(id: number) {
    if (id > 0) setDeletedTaskIds((cur) => [...cur, id]);
    setAllTasks((cur) => (cur ?? []).filter((t) => t.id !== id));
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (form.note.length > 500) {
      setError("备注不能超过 500 个字符");
      return;
    }

    const completed = dayTasks.filter((t) => t.done).length;
    const total = dayTasks.length;

    setSubmitting(true);
    try {
      // 1. 同步任务清单（删除 / 新建 / 更新）
      for (const id of deletedTaskIds) {
        await api.deleteTask(id);
      }
      for (const t of dayTasks) {
        if (t.id < 0) {
          await api.createTask({
            date: t.date,
            title: t.title,
            done: t.done,
            importance: t.importance,
          });
        } else {
          await api.updateTask(t.id, { title: t.title, done: t.done, importance: t.importance });
        }
      }

      // 2. 保存记录（任务完成数由清单派生）与社交
      const recordPayload: RecordInput = {
        date: form.date,
        sleep: Number(form.sleep) || 0,
        study_time: form.study_time,
        exercise: form.exercise,
        mood: form.mood,
        focus: form.focus,
        reading_time: form.reading_time,
        skill_time: form.skill_time,
        diet: form.diet,
        stress: form.stress,
        energy: form.energy,
        tasks_completed: completed,
        tasks_total: total,
        note: form.note.trim() || null,
      };
      const socialPayload: SocialInput = {
        date: form.date,
        interactions: form.social_interactions,
        social_time: 0,
        quality: form.social_quality,
      };

      const [savedRecord, savedSocial] = await Promise.all([
        api.upsertRecord(recordPayload),
        api.upsertSocial(socialPayload),
      ]);

      const freshTasks = await api.tasks();
      setAllTasks(freshTasks);
      setDeletedTaskIds([]);
      setRecords((cur) => {
        const without = (cur ?? []).filter((r) => r.date !== savedRecord.date);
        return [...without, savedRecord];
      });
      setSocials((cur) => {
        const without = (cur ?? []).filter((s) => s.date !== savedSocial.date);
        return [...without, savedSocial];
      });
      setForm(withSocial(recordToForm(savedRecord), savedSocial));
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
      setRecords((cur) => (cur ?? []).filter((item) => item.id !== record.id));

      const social = socials?.find((item) => item.date === record.date);
      if (social) {
        try {
          await api.deleteSocial(social.id);
          setSocials((cur) => (cur ?? []).filter((item) => item.id !== social.id));
        } catch {
          // 社交记录删除失败不阻断主流程
        }
      }

      if (form.date === record.date) setForm(emptyForm(record.date));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <Page>
        <div className="mx-auto max-w-6xl">
          <p className="py-16 text-center text-sm text-muted-foreground">正在加载…</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-mono text-2xl font-semibold">每日记录</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              选个大概的档位即可，保存后会重新计算属性、经验与成就。
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
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <Label>学习时间</Label>
                  <Chips
                    options={DURATION_OPTIONS}
                    value={form.study_time}
                    onChange={(v) => set("study_time", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>阅读时长</Label>
                  <Chips
                    options={DURATION_OPTIONS}
                    value={form.reading_time}
                    onChange={(v) => set("reading_time", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>技能练习</Label>
                  <Chips
                    options={DURATION_OPTIONS}
                    value={form.skill_time}
                    onChange={(v) => set("skill_time", v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    如乐器、语言、编程等，练了多久就点哪个档。
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                健康
              </h2>
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="sleep">睡眠时长（小时）</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="sleep"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={form.sleep}
                      onChange={(e) => set("sleep", e.target.value)}
                      className="w-24"
                    />
                    {[6, 7, 8].map((h) => (
                      <Button
                        key={h}
                        type="button"
                        variant={Number(form.sleep) === h ? "default" : "outline"}
                        size="sm"
                        onClick={() => set("sleep", String(h))}
                      >
                        {h} 小时
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>运动</Label>
                  <Chips
                    options={DURATION_OPTIONS}
                    value={form.exercise}
                    onChange={(v) => set("exercise", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>饮食情况</Label>
                  <ScoreButtons
                    options={DIET_OPTIONS}
                    value={form.diet}
                    onChange={(v) => set("diet", v)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                状态
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>心情</Label>
                  <ScoreButtons
                    options={MOOD_OPTIONS}
                    value={form.mood}
                    onChange={(v) => set("mood", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>专注</Label>
                  <ScoreButtons
                    options={FOCUS_OPTIONS}
                    value={form.focus}
                    onChange={(v) => set("focus", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>压力</Label>
                  <ScoreButtons
                    options={STRESS_OPTIONS}
                    value={form.stress}
                    onChange={(v) => set("stress", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>精力</Label>
                  <ScoreButtons
                    options={ENERGY_OPTIONS}
                    value={form.energy}
                    onChange={(v) => set("energy", v)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                社交
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>互动频率</Label>
                  <Chips
                    options={FREQUENCY_OPTIONS}
                    value={form.social_interactions}
                    onChange={(v) => set("social_interactions", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>社交质量</Label>
                  <ScoreButtons
                    options={QUALITY_OPTIONS}
                    value={form.social_quality}
                    onChange={(v) => set("social_quality", v)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                任务
              </h2>
              <div className="space-y-3">
                {dayTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    还没有任务，添加一个今天想完成的事吧。
                  </p>
                )}
                <ul className="space-y-2">
                  {dayTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                        className="h-4 w-4 shrink-0 accent-primary"
                        aria-label={`完成：${task.title}`}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm",
                          task.done && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {IMPORTANCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTaskImportance(task.id, opt.value)}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs transition-colors",
                              task.importance === opt.value
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border text-muted-foreground hover:bg-secondary",
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="删除任务"
                        aria-label={`删除任务：${task.title}`}
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                    placeholder="添加任务，如「读完一章」"
                    maxLength={200}
                  />
                  <Button type="button" variant="outline" onClick={addTask}>
                    添加
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  勾选完成、标上重要性，保存后任务完成数会自动计入经验与成就。
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-1.5">
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
                {!records && !error && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">正在加载…</p>
                )}
                {error && <p className="px-2 py-4 text-sm text-destructive">{error}</p>}
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
