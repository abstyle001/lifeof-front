import {
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Search,
  Sparkles,
  Target,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * 可选徽标键。目前仅支持 "unread"（私聊未读总数），由 Sidebar/MobileNav
   * 通过 useUnread() 读取并渲染。将来若要加其他徽标（如通知），扩这个联合类型即可。
   */
  badge?: "unread";
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/record", label: "记录", icon: PenLine },
  { to: "/analytics", label: "分析", icon: BarChart3 },
  { to: "/discover", label: "发现", icon: Search },
  { to: "/messages", label: "消息", icon: MessageSquare, badge: "unread" },
  { to: "/ai", label: "AI 教练", icon: Sparkles },
  { to: "/goals", label: "目标", icon: Target },
  { to: "/achievements", label: "成就", icon: Trophy },
  { to: "/profile", label: "我的", icon: User },
];
