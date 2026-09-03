import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, AUTH_UNAUTHORIZED_EVENT, UnauthorizedError } from "./api";
import { clearToken, getToken, setToken } from "./tokenStore";
import type { User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "connection-error";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    try {
      if (!(await getToken())) {
        setUser(null);
        setStatus("anonymous");
        return;
      }
      const currentUser = await api.me();
      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      setUser(null);
      setStatus(error instanceof UnauthorizedError ? "anonymous" : "connection-error");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  async function login(username: string, password: string) {
    const token = await api.login(username, password);
    await setToken(token.access_token);
    setUser(token.user);
    setStatus("authenticated");
  }

  async function register(username: string, password: string) {
    const token = await api.register(username, password);
    await setToken(token.access_token);
    setUser(token.user);
    setStatus("authenticated");
  }

  async function logout() {
    await clearToken();
    setUser(null);
    setStatus("anonymous");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loading: status === "loading",
        setUser,
        login,
        register,
        logout,
        retryConnection: bootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
