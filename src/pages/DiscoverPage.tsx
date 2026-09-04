import { useState, type FormEvent } from "react";
import { Search, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { ProfileSearchResult } from "@/lib/types";

function ProfileAvatar({ user }: { user: Pick<ProfileSearchResult, "username" | "avatar"> }) {
  if (user.avatar) {
    return (
      <img src={user.avatar} alt={user.username} className="h-12 w-12 rounded-xl object-cover" />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-lg font-bold text-primary-foreground">
      {user.username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) {
      setError("请输入至少 2 个字符的用户名");
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setResults(await api.searchProfiles(normalized));
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : "搜索失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-mono text-2xl font-semibold">发现</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            根据用户名找到公开的 LifeOS 档案，了解彼此的成长状态。
          </p>
        </div>

        <Card className="p-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="profile-search">
              搜索用户名
            </label>
            <Input
              id="profile-search"
              value={query}
              maxLength={50}
              placeholder="输入用户名（至少 2 个字符）"
              autoComplete="off"
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError(null);
              }}
            />
            <Button type="submit" disabled={loading} className="sm:min-w-24">
              <Search className="h-4 w-4" />
              {loading ? "搜索中" : "搜索"}
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </Card>

        {loading && (
          <div className="space-y-3" aria-live="polite" aria-label="正在加载搜索结果">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-20 w-full" />
            ))}
          </div>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <Card className="p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">没有找到公开的用户档案。</p>
            <p className="mt-2 text-xs text-muted-foreground">
              只有开启“公开档案”的用户会出现在搜索结果中。要公开自己的档案，请前往
              <Link className="text-primary underline-offset-4 hover:underline" to="/profile">
                我的
              </Link>
              设置。
            </p>
          </Card>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3" aria-live="polite">
            {results.map((result) => (
              <button
                key={result.username}
                type="button"
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void navigate(`/profiles/${encodeURIComponent(result.username)}`)}
              >
                <ProfileAvatar user={result} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{result.username}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    LV. {result.level} · 经验 {result.experience}
                  </span>
                </span>
                <span className="font-mono text-xs text-primary">查看档案 →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
