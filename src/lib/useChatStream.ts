/**
 * 私聊 SSE 生命周期 hook。
 *
 * 职责：
 * - 登录后初始化 store（myUserId + 首次拉会话列表）
 * - 建立 SSE 长连接，事件驱动增量更新 store
 * - 断线指数退避重连（1s → 2s → … → 30s 上限）
 * - SSE 断线期间启用 30s 兜底轮询，弥补 Vercel Serverless 跨实例漏推
 * - 组件卸载时 abort + 清理定时器
 *
 * 在 AppShell 里调用一次即可（AppShell 只在 <Protected> 内渲染，
 * 天然保证用户已登录）。
 */

import { useEffect } from "react";

import { api } from "./api";
import { unreadStore, useUnread } from "./unreadStore";

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const FALLBACK_POLL_MS = 30_000;

export function useChatStream(userId: number | null) {
  const { sseConnected } = useUnread();

  // 主 effect：SSE 连接 + 重连 + 初始化
  useEffect(() => {
    if (userId === null) return;
    unreadStore.setMyUserId(userId);

    const controller = new AbortController();
    let stopped = false;
    let reconnectTimer: number | undefined;
    let backoff = RECONNECT_INITIAL_MS;

    const refresh = async () => {
      try {
        const list = await api.conversations();
        unreadStore.setConversations(list);
      } catch (err) {
        // 网络抖动或服务端 5xx；下次重连或轮询会再试
        console.warn("[chat] refresh conversations failed", err);
      }
    };

    // store 遇到未知会话时回调（对方刚发起的新会话）
    unreadStore.setRefreshHandler(() => void refresh());

    // 初始化：先拉一次会话列表，保证首屏有数据
    void refresh();

    const connect = async () => {
      if (stopped || controller.signal.aborted) return;
      try {
        unreadStore.setSseConnected(true);
        backoff = RECONNECT_INITIAL_MS; // 连接成功即重置退避
        await api.subscribeChatStream((event) => {
          // 建连首帧：补漏一次（覆盖 SSE 断开期间到达的消息）
          if (event.type === "connected") {
            void refresh();
          }
          unreadStore.applyStreamEvent(event);
        }, controller.signal);
        // subscribeChatStream 正常返回 = 服务端关闭了连接
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn("[chat] SSE error", err);
      } finally {
        unreadStore.setSseConnected(false);
      }
      if (!stopped && !controller.signal.aborted) {
        reconnectTimer = window.setTimeout(() => void connect(), backoff);
        backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      unreadStore.setRefreshHandler(null);
      unreadStore.setSseConnected(false);
    };
  }, [userId]);

  // 兜底轮询：仅在 SSE 未连接时启用
  useEffect(() => {
    if (userId === null || sseConnected) return;
    const timer = window.setInterval(async () => {
      try {
        const list = await api.conversations();
        unreadStore.setConversations(list);
      } catch {
        // 静默失败，下次轮询再试
      }
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [userId, sseConnected]);
}
