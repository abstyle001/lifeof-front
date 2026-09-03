import { useEffect } from "react";
import { isDesktop } from "@/lib/runtime";

const ALLOWED_EXTERNAL_URLS = ["https://github.com/abstyle001/lifeof-front"];

function isAllowedExternalUrl(url: URL): boolean {
  return ALLOWED_EXTERNAL_URLS.some(
    (allowed) => url.href === allowed || url.href.startsWith(`${allowed}/`),
  );
}

export function DesktopRuntime() {
  useEffect(() => {
    if (!isDesktop) return;

    const openExternalLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      if (
        (url.protocol !== "https:" && url.protocol !== "http:") ||
        url.origin === location.origin
      ) {
        return;
      }

      event.preventDefault();
      if (!isAllowedExternalUrl(url)) {
        console.warn(`Blocked external URL outside the desktop allowlist: ${url.href}`);
        return;
      }

      void import("@tauri-apps/plugin-opener")
        .then(({ openUrl }) => openUrl(url))
        .catch((error: unknown) => console.warn("Failed to open external URL", error));
    };

    document.addEventListener("click", openExternalLink);
    return () => document.removeEventListener("click", openExternalLink);
  }, []);

  useEffect(() => {
    if (!isDesktop || !import.meta.env.PROD) return;

    let active = true;
    void (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check({ timeout: 15_000 });
        if (!active || !update) return;

        const accepted = window.confirm(
          `LifeOS ${update.version} 已发布，是否现在下载并安装？

${update.body ?? ""}`,
        );
        if (accepted) await update.downloadAndInstall(undefined, { restartAfterInstall: true });
      } catch (error) {
        console.warn("LifeOS updater check failed", error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
