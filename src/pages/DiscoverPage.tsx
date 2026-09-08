import { useEffect, useState, type FormEvent } from "react";
import { Search, Star, UserRound } from "lucide-react";
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

function UserRow({
  user,
  onOpen,
}: {
  user: ProfileSearchResult;
  onOpen: (username: string) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(user.username)}
    >
      <ProfileAvatar user={user} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{user.username}</span>
        <span className="mt-1 block font-mono text-xs text-muted-foreground">
          LV. {user.level} · 经验 {user.experience}
        </span>
      </span>
      <span className="font-mono text-xs text-primary">查看档案 →</span>
    </button>
  );
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [following, setFollowing] = useState<ProfileSearchResult[] | null>(null);

  useEffect(() => {
    let active = true;
    api
      .followList("me", "following")
      .then((data) => {
        if (active) setFollowing(data);
      })
      .catch(() => {
        // 关注列表加载失败不影响搜索主流程
        if (active) setFollowing([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function openProfile(username: string) {
    return void navigate(`/profiles/${encodeURIComponent(username)}`);
  }

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
            根据用户名找到公开的 LifeOS 档案，关注彼此，一起成长。
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
          <div className="space-y-3" aria-live="polite" aria-label="搜索结果">
            {results.map((result) => (
              <UserRow key={result.username} user={result} onOpen={openProfile} />
            ))}
          </div>
        )}

        {!searched && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              我关注的人
            </div>
            {following === null ? (
              <Skeleton className="h-20 w-full" />
            ) : following.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                还没有关注任何人，搜索用户名找到一起成长的伙伴。
              </Card>
            ) : (
              following.map((user) => (
                <UserRow key={user.username} user={user} onOpen={openProfile} />
              ))
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
