import { isDesktop } from "./runtime";

const TOKEN_KEY = "lifeos_token";

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
}

const webTokenStore: TokenStore = {
  async get() {
    return localStorage.getItem(TOKEN_KEY);
  },
  async set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  async remove() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

const desktopTokenStore: TokenStore = {
  async get() {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string | null>("credential_get");
  },
  async set(token) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("credential_set", { token });
  },
  async remove() {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("credential_remove");
  },
};

const tokenStore = isDesktop ? desktopTokenStore : webTokenStore;
let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await tokenStore.get();
  return cachedToken;
}

export async function setToken(token: string): Promise<void> {
  await tokenStore.set(token);
  cachedToken = token;
}

export async function clearToken(): Promise<void> {
  await tokenStore.remove();
  cachedToken = null;
}
