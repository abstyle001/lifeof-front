import type {
  AchievementsResponse,
  AttributesExplain,
  ChatMessage,
  ChatResponse,
  ChatStreamEvent,
  Conversation,
  Dashboard,
  DailyRecord,
  DirectMessage,
  ExportData,
  FollowAction,
  FollowListKind,
  FollowRelation,
  FollowUser,
  Goal,
  GoalInput,
  GoalUpdate,
  ImportData,
  ImportResult,
  MonthlyReport,
  ProfileSearchResult,
  ProfileSettings,
  ProfileSettingsUpdate,
  PublicProfile,
  RecordInput,
  RecordSave,
  SocialInput,
  SocialInteraction,
  Task,
  TaskInput,
  TaskUpdate,
  Token,
  UnreadCount,
  User,
  UserUpdateInput,
  WeeklyReport,
  WeeklyStatsResponse,
} from "./types";

import { apiTransport, buildApiUrl } from "./runtime";
import { clearToken, getToken } from "./tokenStore";

export const AUTH_UNAUTHORIZED_EVENT = "lifeos:unauthorized";

export class UnauthorizedError extends Error {
  constructor(message = "未登录或登录已过期") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ConnectionError extends Error {
  constructor(message = "无法连接服务器，请检查网络后重试") {
    super(message);
    this.name = "ConnectionError";
  }
}

async function send(path: string, options: RequestInit): Promise<Response> {
  try {
    return await apiTransport.fetch(buildApiUrl(path), options);
  } catch (error) {
    console.warn("LifeOS API connection failed", error);
    throw new ConnectionError();
  }
}

async function responseError(res: Response): Promise<Error> {
  let detail = `请求失败（${res.status}）`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // 响应体非 JSON 时保留默认错误信息。
  }
  return new Error(detail);
}

async function handleUnauthorized(): Promise<never> {
  await clearToken();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  throw new UnauthorizedError();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isAuthEndpoint = path === "/auth/login" || path === "/auth/register";
  const token = isAuthEndpoint ? null : await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await send(path, { ...options, headers });
  if (res.status === 401 && !isAuthEndpoint) return handleUnauthorized();
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestForm<T>(path: string, body: FormData, method: "POST"): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await send(path, { method, headers, body });
  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) throw await responseError(res);
  return res.json() as Promise<T>;
}

/**
 * 通用 SSE 帧解析器：读 ReadableStream，按 `\n\n` 分帧，只解析 `data:` 行的 JSON。
 * 注释帧（`: keepalive`）与空行自动跳过。onFrame 返回 true 表示主动停止，
 * 会 cancel reader 并让 readSSEFrames 正常返回。
 */
async function readSSEFrames<T>(
  res: Response,
  onFrame: (frame: T) => boolean | void,
): Promise<void> {
  if (!res.body) throw new Error("当前运行环境不支持流式响应");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      // 跳过注释帧（SSE keepalive）与空行
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      let obj: T;
      try {
        obj = JSON.parse(data) as T;
      } catch {
        continue;
      }
      if (onFrame(obj) === true) {
        try {
          await reader.cancel();
        } catch {
          // reader 已关闭时忽略
        }
        return;
      }
    }
  }
}

async function streamChat(message: string, onDelta: (delta: string) => void): Promise<string> {
  const token = await getToken();
  const res = await send("/ai/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) throw await responseError(res);

  let full = "";
  let streamError: string | null = null;
  await readSSEFrames<{ delta?: string; error?: string; done?: boolean }>(res, (obj) => {
    if (obj.error) {
      streamError = obj.error;
      return true;
    }
    if (obj.delta) {
      full += obj.delta;
      onDelta(obj.delta);
    }
    if (obj.done) return true;
    return false;
  });
  if (streamError) throw new Error(streamError);
  return full;
}

/**
 * 私聊 SSE 订阅：GET /chat/stream，服务端每 25s 发一个 keepalive 注释帧。
 * 永不主动停，由 AbortSignal 或服务端断开触发结束；调用方负责重连（指数退避）。
 *
 * 命名注意：与 AI 教练的 `api.chatStream`（流式对话）区分开，这里叫
 * `subscribeChatStream`，强调"订阅事件长连接"语义。
 */
async function subscribeChatStream(
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = await getToken();
  const res = await send("/chat/stream", {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  if (res.status === 401) return handleUnauthorized();
  if (!res.ok) throw await responseError(res);

  await readSSEFrames<ChatStreamEvent>(res, (event) => {
    onEvent(event);
    return false;
  });
}

export const api = {
  register: (username: string, password: string) =>
    request<Token>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<Token>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<User>("/auth/me"),
  searchProfiles: (query: string) =>
    request<ProfileSearchResult[]>(`/profiles/search?q=${encodeURIComponent(query)}`),
  publicProfile: (username: string) =>
    request<PublicProfile>(`/profiles/${encodeURIComponent(username)}`),
  profileSettings: () => request<ProfileSettings>("/profiles/me/settings"),
  updateProfileSettings: (input: ProfileSettingsUpdate) =>
    request<ProfileSettings>("/profiles/me/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  follow: (username: string) =>
    request<FollowAction>(`/follows/${encodeURIComponent(username)}`, { method: "POST" }),
  unfollow: (username: string) =>
    request<FollowAction>(`/follows/${encodeURIComponent(username)}`, { method: "DELETE" }),
  followRelation: (username: string) =>
    request<FollowRelation>(`/follows/${encodeURIComponent(username)}/relation`),
  followList: (username: string, kind: FollowListKind) =>
    request<FollowUser[]>(`/follows/${encodeURIComponent(username)}/${kind}`),
  dashboard: () => request<Dashboard>("/dashboard"),
  attributesExplain: () => request<AttributesExplain>("/dashboard/attributes/explain"),
  records: () => request<DailyRecord[]>("/records"),
  upsertRecord: (record: RecordInput) =>
    request<RecordSave>("/records", {
      method: "POST",
      body: JSON.stringify(record),
    }),
  deleteRecord: (recordId: number) =>
    request<void>(`/records/${recordId}`, {
      method: "DELETE",
    }),
  achievements: () => request<AchievementsResponse>("/achievements"),
  weeklyStats: () => request<WeeklyStatsResponse>("/ai/weekly-stats"),
  weeklyReport: (refresh = false) =>
    request<WeeklyReport>(`/ai/weekly-report${refresh ? "?refresh=true" : ""}`),
  chat: (message: string) =>
    request<ChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  chatHistory: () => request<ChatMessage[]>("/ai/chat/messages"),
  chatStream: (message: string, onDelta: (delta: string) => void) => streamChat(message, onDelta),
  monthlyReport: () => request<MonthlyReport>("/ai/monthly-report"),
  social: () => request<SocialInteraction[]>("/social"),
  upsertSocial: (social: SocialInput) =>
    request<SocialInteraction>("/social", {
      method: "POST",
      body: JSON.stringify(social),
    }),
  deleteSocial: (socialId: number) =>
    request<void>(`/social/${socialId}`, {
      method: "DELETE",
    }),
  updateMe: (update: UserUpdateInput) =>
    request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(update),
    }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return requestForm<User>("/auth/me/avatar", form, "POST");
  },
  removeAvatar: () => request<User>("/auth/me/avatar", { method: "DELETE" }),
  tasks: () => request<Task[]>("/tasks"),
  createTask: (input: TaskInput) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTask: (taskId: number, update: TaskUpdate) =>
    request<Task>(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    }),
  deleteTask: (taskId: number) => request<void>(`/tasks/${taskId}`, { method: "DELETE" }),
  goals: () => request<Goal[]>("/goals"),
  createGoal: (input: GoalInput) =>
    request<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateGoal: (goalId: number, update: GoalUpdate) =>
    request<Goal>(`/goals/${goalId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    }),
  deleteGoal: (goalId: number) => request<void>(`/goals/${goalId}`, { method: "DELETE" }),
  exportData: () => request<ExportData>("/export"),
  importData: (data: ImportData) =>
    request<ImportResult>("/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Direct Chat（用户私聊） ---
  // 命名避开 `chat*` 前缀：api.chat / chatHistory / chatStream 已被 AI 教练占用。
  conversations: (limit = 50) => request<Conversation[]>(`/chat/conversations?limit=${limit}`),
  createConversation: (peer: string) =>
    request<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ peer }),
    }),
  messages: (conversationId: number, beforeId?: number, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId != null) params.set("before_id", String(beforeId));
    return request<DirectMessage[]>(
      `/chat/conversations/${conversationId}/messages?${params.toString()}`,
    );
  },
  sendMessage: (conversationId: number, content: string, clientMessageId?: string) =>
    request<DirectMessage>(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(
        clientMessageId ? { content, client_message_id: clientMessageId } : { content },
      ),
    }),
  markConversationRead: (conversationId: number, messageId?: number) =>
    request<UnreadCount>(`/chat/conversations/${conversationId}/read`, {
      method: "POST",
      body: JSON.stringify(messageId != null ? { message_id: messageId } : {}),
    }),
  hideConversation: (conversationId: number) =>
    request<void>(`/chat/conversations/${conversationId}`, { method: "DELETE" }),
  unreadCount: () => request<UnreadCount>("/chat/unread-count"),
  /** SSE 长连接订阅；调用方负责重连（见 AppShell 的指数退避逻辑）。 */
  subscribeChatStream: (onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal) =>
    subscribeChatStream(onEvent, signal),
};
