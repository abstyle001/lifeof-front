import { useState } from "react";
import { Check, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Goal } from "@/lib/types";

export function GoalsPage() {
  const { data: goals, error, loading, reload } = useFetch(api.goals);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "操作失败，请稍后重试");
    }
  }

  function handleCreate() {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    void runAction(async () => {
      await api.createGoal({ title, done: false });
      setNewTitle("");
    }).finally(() => setCreating(false));
  }

  function handleToggle(goal: Goal) {
    setBusyId(goal.id);
    void runAction(async () => {
      await api.updateGoal(goal.id, { done: !goal.done });
    }).finally(() => setBusyId(null));
  }

  function handleSaveEdit(goal: Goal) {
    const title = editTitle.trim();
    if (!title) return;
    setBusyId(goal.id);
    void runAction(async () => {
      await api.updateGoal(goal.id, { title });
      setEditingId(null);
    }).finally(() => setBusyId(null));
  }

  function handleDelete(goal: Goal) {
    setBusyId(goal.id);
    void runAction(async () => {
      await api.deleteGoal(goal.id);
    }).finally(() => setBusyId(null));
  }

  return (
    <Page>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-mono text-2xl font-semibold">目标</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            长期的成长方向，可随时勾选完成
          </p>
        </div>

        <Card className="p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            新建目标
          </h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={newTitle}
              maxLength={200}
              placeholder="例如：连续打卡 30 天"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              <Plus />
              添加
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            我的目标 · {goals?.length ?? 0}
          </h2>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error || !goals ? (
            <p className="mt-4 text-sm text-destructive">{error ?? "加载失败"}</p>
          ) : goals.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <Target className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                还没有目标，创建第一个长期目标开始你的成长规划
              </p>
            </div>
          ) : (
            <ul className="mt-2">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="group flex items-center gap-3 border-b border-border py-3 last:border-0"
                >
                  <button
                    type="button"
                    aria-label={goal.done ? "标记为未完成" : "标记为完成"}
                    disabled={busyId === goal.id}
                    onClick={() => handleToggle(goal)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                      goal.done
                        ? "border-[#34d399] bg-[#34d399] text-black"
                        : "border-border hover:border-[#34d399]"
                    }`}
                  >
                    {goal.done && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {editingId === goal.id ? (
                    <Input
                      autoFocus
                      value={editTitle}
                      maxLength={200}
                      className="h-8 flex-1"
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(goal);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm ${
                        goal.done ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {goal.title}
                    </span>
                  )}

                  {editingId === goal.id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === goal.id}
                      onClick={() => handleSaveEdit(goal)}
                    >
                      保存
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="编辑目标"
                      className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      onClick={() => {
                        setEditingId(goal.id);
                        setEditTitle(goal.title);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="删除目标"
                    disabled={busyId === goal.id}
                    className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                    onClick={() => handleDelete(goal)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {actionError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </Card>
      </div>
    </Page>
  );
}
