import {
  BarChart3,
  LayoutDashboard,
  PenLine,
  Search,
  Sparkles,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/record", label: "记录", icon: PenLine },
  { to: "/analytics", label: "分析", icon: BarChart3 },
  { to: "/discover", label: "发现", icon: Search },
  { to: "/ai", label: "AI 教练", icon: Sparkles },
  { to: "/achievements", label: "成就", icon: Trophy },
  { to: "/profile", label: "我的", icon: User },
];
