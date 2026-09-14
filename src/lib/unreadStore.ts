/**
 * 私聊未读与会话列表的全局 store。
 *
 * 用 `useSyncExternalStore` 实现极简订阅，避免引入 Zustand 等外部状态库。
 * 数据流：
 * - 登录后 AppShell 调 `setMyUserId()` + `setConversations()` 初始化
 * - SSE 事件到达时调 `applyStreamEvent()` 做增量更新
 * - 用户打开会话页时调 `markConversationReadLocal()` 乐观清零未读
 * - 兜底轮询（SSE 断线时）调 `setConversations()` 全量刷新
 *
 * 快照稳定性：`getSnapshot()` 返回缓存的 state 对象引用，只在真实变更时
 * 重建，避免 useSyncExternalStore 无限重渲染。
 */

import { useSyncExternalStore } from "react";

import type { ChatStreamEvent, Conversation } from "./types";

export interface UnreadState {
  conversations: Conversation[];
  totalUnread: number;
  sseConnected: boolean;
  myUserId: number | null;
}

type Listener = () => void;
type EventListener = (event: ChatStreamEvent) => void;

let state: UnreadState = {
  conversations: [],
  totalUnread: 0,
  sseConnected: false,
  myUserId: null,
};

const listeners = new Set<Listener>();
const eventListeners = new Set<EventListener>();

/** 当 SSE 事件引用了 store 里不存在的会话时触发（例如对方刚发起的新会话）。 */
let onNeedsRefresh: (() => void) | null = null;

function emit() {
  for (const l of listeners) l();
}

function computeTotal(conversations: Conversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}

function setState(patch: Partial<UnreadState>) {
  const next: UnreadState = { ...state, ...patch };
  if (patch.conversations !== undefined) {
    next.totalUnread = computeTotal(next.conversations);
  }
  state = next;
  emit();
}

export const unreadStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): UnreadState {
    return state;
  },

  /** 注册"需要全量刷新"回调；SSE 收到未知会话时调用。 */
  setRefreshHandler(fn: (() => void) | null) {
    onNeedsRefresh = fn;
  },

  setMyUserId(id: number | null) {
    if (state.myUserId === id) return;
    setState({ myUserId: id });
  },

  setSseConnected(connected: boolean) {
    if (state.sseConnected === connected) return;
    setState({ sseConnected: connected });
  },

  upsertConversation(conversation: Conversation) {
    const rest = state.conversations.filter((c) => c.id !== conversation.id);
    this.setConversations([conversation, ...rest]);
  },

  /** 全量替换会话列表（初始化、兜底轮询、手动刷新时调用）。 */
  setConversations(conversations: Conversation[]) {
    // 按 last_message_at DESC 排序（服务端已排好，这里兜底）
    const sorted = [...conversations].sort((a, b) => {
      const ta = a.last_message_at ?? a.created_at;
      const tb = b.last_message_at ?? b.created_at;
      return tb.localeCompare(ta);
    });
    setState({ conversations: sorted });
  },

  /** 乐观清零某会话的未读（用户打开会话页时立即调用，不等服务端确认）。 */
  markConversationReadLocal(conversationId: number) {
    const idx = state.conversations.findIndex((c) => c.id === conversationId);
    if (idx < 0) return;
    const conv = state.conversations[idx];
    if (conv.unread_count === 0) return;
    const next = [...state.conversations];
    next[idx] = { ...conv, unread_count: 0 };
    setState({ conversations: next });
  },

  /** 注册原始 SSE 事件监听（ConversationPage 等需要逐条消息的页面使用）。 */
  addEventListener(fn: EventListener): () => void {
    eventListeners.add(fn);
    return () => {
      eventListeners.delete(fn);
    };
  },

  /** 应用一条 SSE 事件，增量更新 store。 */
  applyStreamEvent(event: ChatStreamEvent) {
    switch (event.type) {
      case "connected":
        // 建连首帧，无需更新状态（sseConnected 由 AppShell 在调用前设置）
        break;

      case "message.new": {
        const idx = state.conversations.findIndex((c) => c.id === event.conversation_id);
        if (idx < 0) {
          // 未知会话（对方刚发起、或我隐藏后对方又发消息）→ 触发全量刷新
          onNeedsRefresh?.();
          break;
        }
        const conv = state.conversations[idx];
        const isMine = state.myUserId !== null && event.message.sender_id === state.myUserId;
        const nextConv: Conversation = {
          ...conv,
          last_message: event.message,
          last_message_at: event.message.created_at,
          // 自己发的消息（多标签同步）不增加未读；对方发的 +1
          unread_count: isMine ? conv.unread_count : conv.unread_count + 1,
        };
        const next = [...state.conversations];
        next.splice(idx, 1);
        next.unshift(nextConv); // 移到列表顶部
        setState({ conversations: next });
        break;
      }

      case "message.read":
        // MVP 不展示已读回执；事件保留给将来用。
        break;

      case "conversation.hidden": {
        // 服务端只推给执行隐藏的用户本人；从列表移除即可。
        const next = state.conversations.filter((c) => c.id !== event.conversation_id);
        if (next.length !== state.conversations.length) {
          setState({ conversations: next });
        }
        break;
      }
    }

    // 无论 store 是否变更，都把原始事件广播给页面级监听者
    for (const fn of eventListeners) {
      try {
        fn(event);
      } catch (err) {
        console.warn("[chat] event listener error", err);
      }
    }
  },
};

/** React hook：订阅 store 快照。 */
export function useUnread(): UnreadState {
  return useSyncExternalStore(
    (listener) => unreadStore.subscribe(listener),
    () => unreadStore.getSnapshot(),
    () => unreadStore.getSnapshot(),
  );
}
