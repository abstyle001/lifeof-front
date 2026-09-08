import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useChatStream } from "@/lib/useChatStream";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const { user } = useAuth();
  // 私聊 SSE 长连接 + 会话列表初始化 + 兜底轮询；仅在已登录时生效
  useChatStream(user?.id ?? null);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
