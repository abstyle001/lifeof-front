export type AppRuntime = "web" | "desktop";

export const appRuntime: AppRuntime =
  import.meta.env.VITE_APP_RUNTIME === "desktop" ? "desktop" : "web";
export const isDesktop = appRuntime === "desktop";

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredApiBase ? `${configuredApiBase}${normalizedPath}` : `/api${normalizedPath}`;
}

export interface ApiTransport {
  fetch(input: URL | Request | string, init?: RequestInit): Promise<Response>;
}

const browserTransport: ApiTransport = {
  fetch(input, init) {
    return globalThis.fetch(input, init);
  },
};

const desktopTransport: ApiTransport = {
  async fetch(input, init) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    return fetch(input, init);
  },
};

export const apiTransport = isDesktop ? desktopTransport : browserTransport;
