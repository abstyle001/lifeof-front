import { Navigate, Route, Routes } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./lib/auth";
import { AchievementsPage } from "./pages/AchievementsPage";
import { AiCoachPage } from "./pages/AiCoachPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { RecordPage } from "./pages/RecordPage";
import { RegisterPage } from "./pages/RegisterPage";

function ConnectionError() {
  const { retryConnection, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>无法连接 LifeOS 服务</CardTitle>
          <CardDescription>
            桌面程序已经启动，但当前无法访问云端 API。登录状态已安全保留。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => void retryConnection()}>重试连接</Button>
          <Button variant="outline" onClick={() => void logout()}>
            返回登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Protected() {
  const { user, status } = useAuth();
  if (status === "loading") return null;
  if (status === "connection-error") return <ConnectionError />;
  if (status === "anonymous" || !user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profiles/:username" element={<PublicProfilePage />} />
        <Route path="/ai" element={<AiCoachPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
