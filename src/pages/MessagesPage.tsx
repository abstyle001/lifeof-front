import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Search } from "lucide-react";

import { api } from "@/lib/api";
import { relativeTime } from "@/lib/relativeTime";
import { unreadStore, useUnread } from "@/lib/unreadStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function PeerAvatar({ avatar, username }: { avatar: string | null; username: string }) {
  if (avatar) {
    return <img src={avatar} alt={username} className="h-11 w-11 rounded-xl object-cover" />;
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-base font-bold text-white">
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function MessagesPage() {
  const navigate = useNavigate();
  const { conversations, totalUnread } = useUnread();

  // 进入页面时主动刷一次，覆盖 SSE 断线期间可能漏掉的变更
  useEffect(() => {
    let active = true;
    api
      .conversations()
      .then((list) => {
        if (active) unreadStore.setConversations(list);
      })
      .catch(() => {
        // 静默失败；store 里已有数据仍可用
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">消息</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} 条未读` : "暂无未读消息"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void navigate("/discover")}>
          <Search className="h-4 w-4" />
          去找朋友
        </Button>
      </header>

      {conversations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">还没有消息</p>
            <p className="mt-1 text-xs text-muted-foreground">
              去发现页关注感兴趣的人，关注后即可发起聊天。
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void navigate("/discover")}>
            <Search className="h-4 w-4" />
            浏览发现页
          </Button>
        </Card>
      ) : (
        <Card className="divide-y divide-border/60 overflow-hidden">
          {conversations.map((conv) => {
            const preview = conv.last_message
              ? `${conv.last_message.sender_username === conv.peer.username ? "" : "我："}${conv.last_message.content}`
              : "暂无消息";
            const when = conv.last_message_at ?? conv.created_at;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => void navigate(`/messages/${conv.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
              >
                <PeerAvatar avatar={conv.peer.avatar} username={conv.peer.username} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{conv.peer.username}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {relativeTime(when)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{preview}</span>
                    {conv.unread_count > 0 && (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 font-mono text-[10px] font-bold text-white">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
