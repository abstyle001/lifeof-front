/**
 * 相对时间格式化工具（中文）。
 *
 * 用于私聊会话列表与消息气泡的时间显示：
 * - < 1 分钟："刚刚"
 * - < 60 分钟："N 分钟前"
 * - < 24 小时："N 小时前"
 * - < 7 天："N 天前"
 * - >= 7 天：本地化日期（zh-CN）
 *
 * 输入是后端返回的 ISO 字符串（UTC naive，前端按本地时区解析）。
 */

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 0) return "刚刚"; // 时钟漂移兜底
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

/**
 * 消息气泡下方的短时间显示：今天只显示 HH:MM，昨天显示"昨天 HH:MM"，
 * 更早显示 MM-DD HH:MM。
 */
export function messageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const hhmm = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return hhmm;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `昨天 ${hhmm}`;
  const mmdd = d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  return `${mmdd} ${hhmm}`;
}
