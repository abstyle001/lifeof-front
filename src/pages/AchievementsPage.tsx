import { CheckCircle2, Lock } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

export function AchievementsPage() {
  const { data, error, loading } = useFetch(api.achievements);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? "加载失败"}</p>;
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 font-mono text-2xl font-semibold">成就</h1>

        {data.unlocked.length > 0 && (
          <>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              已解锁 · {data.unlocked.length}
            </h2>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.unlocked.map((a) => (
                <Card key={a.code} className="flex items-start gap-3 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#34d399]" />
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted-foreground">{a.description}</div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          未解锁 · {data.locked.length}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.locked.map((a) => (
            <Card key={a.code} className="flex items-start gap-3 border-dashed p-5 opacity-60">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.description}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}
