import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Send, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { messageTime } from "@/lib/relativeTime";
import { unreadStore, useUnread } from "@/lib/unreadStore";
import { useAuth } from "@/lib/auth";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DirectMessage } from "@/lib/types";

/** 本地消息 = 服务端消息 + 乐观更新状态。id < 0 表示尚未落库的临时消息。 */
type LocalMessage = DirectMessage & { status?: "sending" | "failed" };

function newClientMessageId(): string {
  // crypto.randomUUID 在现代浏览器与 Tauri WebView2 中均可用
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function PeerAvatar({ avatar, username }: { avatar: string | null; username: string }) {
  if (avatar) {
    return <img src={avatar} alt={username} className="h-9 w-9 rounded-lg object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-sm font-bold text-white">
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function ConversationPage() {
  const { conversationId: rawId } = useParams<{ conversationId: string }>();
  const conversationId = Number(rawId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, myUserId } = useUnread();

  const conv = conversations.find((c) => c.id === conversationId) ?? null;
  const selfId = user?.id ?? myUserId;
  const [peerLastRead, setPeerLastRead] = useState<number | null>(
    conv?.peer_last_read_message_id ?? null,
  );

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{
    kind: "private" | "unfollow" | "rate" | "other";
    text: string;
  } | null>(null);
  const [rateLockUntil, setRateLockUntil] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldStickToBottom = useRef(true);
  const pendingPrepend = useRef(false);
  const prevScrollHeight = useRef(0);

  // -----------------------------------------------------------------------
  // 初始加载消息
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!Number.isFinite(conversationId)) return;
    let active = true;
    setLoading(true);
    api
      .messages(conversationId, undefined, 50)
      .then((list) => {
        if (!active) return;
        setMessages(list);
        setHasMore(list.length >= 50);
        shouldStickToBottom.current = true;
      })
      .catch((err) => {
        if (!active) return;
        const text = err instanceof Error ? err.message : String(err);
        setBanner({ kind: "other", text });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  // 进入会话即标记已读（乐观 + 服务端）
  useEffect(() => {
    if (!Number.isFinite(conversationId)) return;
    unreadStore.markConversationReadLocal(conversationId);
    api.markConversationRead(conversationId).catch(() => {
      // 静默失败；下次进入会再试
    });
  }, [conversationId]);

  useEffect(() => {
    const value = conv?.peer_last_read_message_id ?? null;
    if (value == null) return;
    setPeerLastRead((current) => (current != null && current >= value ? current : value));
  }, [conv?.peer_last_read_message_id]);

  // -----------------------------------------------------------------------
  // 订阅 SSE：本会话的新消息直接 append
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!Number.isFinite(conversationId)) return;
    const off = unreadStore.addEventListener((event) => {
      if (event.type !== "message.new" && event.type !== "message.read") return;
      if (event.conversation_id !== conversationId) return;
      if (event.type === "message.read") {
        if (selfId !== null && event.reader_id !== selfId) {
          setPeerLastRead((current) =>
            current != null && current >= event.message_id ? current : event.message_id,
          );
        }
        return;
      }
      const msg = event.message;
      setMessages((cur) => {
        // 去重：乐观消息可能已被服务端返回替换，或 SSE 与 REST 响应同时到达
        if (cur.some((m) => m.id === msg.id)) return cur;
        // 如果存在同 client_message_id 的临时消息，替换之
        if (msg.client_message_id) {
          const idx = cur.findIndex(
            (m) => m.client_message_id === msg.client_message_id && m.id < 0,
          );
          if (idx >= 0) {
            const copy = [...cur];
            copy[idx] = msg;
            return copy;
          }
        }
        return [...cur, msg];
      });
      shouldStickToBottom.current = true;
      // 对方发来的消息 → 标记已读
      if (selfId !== null && msg.sender_id !== selfId) {
        unreadStore.markConversationReadLocal(conversationId);
        api.markConversationRead(conversationId, msg.id).catch(() => {});
      }
    });
    return off;
  }, [conversationId, selfId]);

  // -----------------------------------------------------------------------
  // 自动滚动：新消息贴底；加载更多时保持视觉位置
  // -----------------------------------------------------------------------
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pendingPrepend.current) {
      // prepend 后恢复滚动位置：新 scrollHeight - 旧 scrollHeight = 应补偿的偏移
      const delta = el.scrollHeight - prevScrollHeight.current;
      el.scrollTop = delta;
      pendingPrepend.current = false;
      return;
    }
    if (shouldStickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 距底 40px 以内视为"贴底"，新消息到达时自动滚
    shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    // 滚到顶触发加载更多
    if (el.scrollTop === 0 && hasMore && !loadingMore && !loading && messages.length > 0) {
      void loadMore();
    }
  }, [hasMore, loadingMore, loading, messages.length]);

  const loadMore = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    setLoadingMore(true);
    prevScrollHeight.current = el.scrollHeight;
    pendingPrepend.current = true;
    try {
      const older = await api.messages(conversationId, messages[0].id, 50);
      setMessages((cur) => [...older, ...cur]);
      setHasMore(older.length >= 50);
    } catch {
      pendingPrepend.current = false;
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, messages]);

  // -----------------------------------------------------------------------
  // 发送消息（乐观更新 + 幂等 client_message_id）
  // -----------------------------------------------------------------------
  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current;
      const start = el?.selectionStart ?? input.length;
      const end = el?.selectionEnd ?? input.length;
      const next = input.slice(0, start) + emoji + input.slice(end);
      if (next.length > 2000) return;
      setInput(next);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + emoji.length;
        el?.setSelectionRange(pos, pos);
      });
    },
    [input],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !conv || !user) return;
    if (Date.now() < rateLockUntil) return;

    setInput("");
    setSending(true);
    setBanner(null);

    const cmid = newClientMessageId();
    const tempId = -Date.now();
    const optimistic: LocalMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_username: user.username,
      content: text,
      created_at: new Date().toISOString(),
      client_message_id: cmid,
      status: "sending",
    };
    setMessages((cur) => [...cur, optimistic]);
    shouldStickToBottom.current = true;

    try {
      const saved = await api.sendMessage(conversationId, text, cmid);
      setMessages((cur) => cur.map((m) => (m.id === tempId ? saved : m)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((cur) =>
        cur.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m)),
      );
      if (msg.includes("不可见")) {
        setBanner({ kind: "private", text: "对方已关闭公开档案，无法发送新消息" });
      } else if (msg.includes("关注")) {
        setBanner({ kind: "unfollow", text: "你或对方已取消关注，无法继续对话" });
      } else if (msg.includes("频繁")) {
        setBanner({ kind: "rate", text: "发送太快了，歇一会儿" });
        setRateLockUntil(Date.now() + 3000);
      } else {
        setBanner({ kind: "other", text: msg });
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, conv, user, conversationId, rateLockUntil]);

  const retryMessage = useCallback(
    async (failed: LocalMessage) => {
      if (!user) return;
      setMessages((cur) =>
        cur.map((m) => (m.id === failed.id ? { ...m, status: "sending" as const } : m)),
      );
      try {
        const saved = await api.sendMessage(
          conversationId,
          failed.content,
          failed.client_message_id ?? newClientMessageId(),
        );
        setMessages((cur) => cur.map((m) => (m.id === failed.id ? saved : m)));
        setBanner(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((cur) =>
          cur.map((m) => (m.id === failed.id ? { ...m, status: "failed" as const } : m)),
        );
        setBanner({ kind: "other", text: msg });
      }
    },
    [conversationId, user],
  );

  const handleHide = useCallback(async () => {
    if (!conv) return;
    if (!window.confirm(`确定要隐藏与 ${conv.peer.username} 的会话吗？对方不会收到通知。`)) return;
    try {
      await api.hideConversation(conversationId);
      void navigate("/messages");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBanner({ kind: "other", text: msg });
    }
  }, [conv, conversationId, navigate]);

  // -----------------------------------------------------------------------
  // 渲染
  // -----------------------------------------------------------------------
  if (!Number.isFinite(conversationId)) {
    return <p className="text-sm text-muted-foreground">无效的会话。</p>;
  }

  if (!loading && !conv) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-muted-foreground">会话不存在或已被隐藏。</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void navigate("/messages")}
        >
          <ArrowLeft className="h-4 w-4" />
          返回消息列表
        </Button>
      </Card>
    );
  }

  const rateLocked = Date.now() < rateLockUntil;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col gap-3">
      {/* 顶部：对方信息 + 操作 */}
      <Card className="flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-2"
          onClick={() => void navigate("/messages")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {conv && (
          <>
            <button
              type="button"
              onClick={() => void navigate(`/profiles/${conv.peer.username}`)}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <PeerAvatar avatar={conv.peer.avatar} username={conv.peer.username} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{conv.peer.username}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  LV. {conv.peer.level} · 查看档案 →
                </div>
              </div>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-muted-foreground hover:text-destructive"
                onClick={() => void handleHide()}
                title="隐藏会话"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 错误 banner */}
      {banner && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{banner.text}</span>
          {banner.kind === "unfollow" && conv && (
            <button
              type="button"
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={() => void navigate(`/profiles/${conv.peer.username}`)}
            >
              重新关注
            </button>
          )}
          <button
            type="button"
            className="shrink-0 opacity-60 hover:opacity-100"
            onClick={() => setBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 消息区 */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="ml-auto h-10 w-2/3 rounded-lg" />
              <Skeleton className="mr-auto h-10 w-1/2 rounded-lg" />
              <Skeleton className="ml-auto h-10 w-3/5 rounded-lg" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有消息，打个招呼吧 👋
            </p>
          ) : (
            <>
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Skeleton className="h-4 w-24" />
                </div>
              )}
              {messages.map((m) => {
                const mine = Boolean(
                  user && (m.sender_id === user.id || m.sender_username === user.username),
                );
                const failed = m.status === "failed";
                const pending = m.status === "sending";
                const read = m.id > 0 && peerLastRead != null && m.id <= peerLastRead;
                return (
                  <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div className="flex max-w-[85%] items-end gap-1.5">
                      {mine && !failed && !pending && (
                        <span
                          className={
                            read
                              ? "mb-1 shrink-0 text-[11px] font-medium text-primary"
                              : "mb-1 shrink-0 text-[11px] text-muted-foreground"
                          }
                        >
                          {read ? "已读" : "未读"}
                        </span>
                      )}
                      <div
                        className={[
                          "min-w-0 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                          mine ? "bg-primary/15" : "bg-secondary",
                          pending ? "opacity-60" : "",
                          failed ? "border border-destructive/60" : "",
                        ].join(" ")}
                      >
                        <div>{m.content}</div>
                        <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[11px] text-muted-foreground">
                          {failed && (
                            <button
                              type="button"
                              className="text-destructive underline-offset-2 hover:underline"
                              onClick={() => void retryMessage(m)}
                            >
                              发送失败，重试
                            </button>
                          )}
                          <span>{pending ? "发送中…" : messageTime(m.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 输入区 */}
        <div className="flex gap-2 border-t p-3">
          <div className="relative min-w-0 flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={rateLocked ? "发送太快，歇一会儿…" : "说点什么…"}
              disabled={sending || rateLocked || !conv}
              maxLength={2000}
              className="pr-10"
            />
            <EmojiPicker disabled={sending || rateLocked || !conv} onSelect={insertEmoji} />
          </div>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || rateLocked || !input.trim() || !conv}
          >
            <Send className="h-4 w-4" />
            发送
          </Button>
        </div>
      </Card>
    </div>
  );
}
