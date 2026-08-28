import type {
  AchievementsResponse,
  ChatMessage,
  ChatResponse,
  Dashboard,
  DailyRecord,
  MonthlyReport,
  RecordInput,
  SocialInput,
  SocialInteraction,
  Token,
  User,
  WeeklyReport,
  WeeklyStatsResponse,
} from "./types";

const TOKEN_KEY = "lifeos_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  const isAuthEndpoint = path === "/auth/login" || path === "/auth/register";
  if (res.status === 401 && !isAuthEndpoint) {
    clearToken();
    window.location.href = "/login";
    throw new Error("未登录或登录已过期");
  }

  if (!res.ok) {
    let detail = `请求失败（${res.status}）`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // 响应体非 JSON 时忽略，保留默认错误信息
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function streamChat(message: string, onDelta: (delta: string) => void): Promise<string> {
  const token = getToken();
  const res = await fetch("/api/ai/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("未登录或登录已过期");
  }
  if (!res.ok) {
    let detail = `请求失败（${res.status}）`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // 响应体非 JSON 时忽略
    }
    throw new Error(detail);
  }
  if (!res.body) throw new Error("浏览器不支持流式响应");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      let obj: { delta?: string; error?: string; done?: boolean };
      try {
        obj = JSON.parse(data) as { delta?: string; error?: string; done?: boolean };
      } catch {
        continue;
      }
      if (obj.error) throw new Error(obj.error);
      if (obj.delta) {
        full += obj.delta;
        onDelta(obj.delta);
      }
      if (obj.done) break;
    }
  }
  return full;
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
  dashboard: () => request<Dashboard>("/dashboard"),
  records: () => request<DailyRecord[]>("/records"),
  upsertRecord: (record: RecordInput) =>
    request<DailyRecord>("/records", {
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
};
