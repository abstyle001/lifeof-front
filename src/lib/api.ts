import type {
  AchievementsResponse,
  Dashboard,
  DailyRecord,
  RecordInput,
  Token,
  User,
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

  return res.json() as Promise<T>;
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
  achievements: () => request<AchievementsResponse>("/achievements"),
};
