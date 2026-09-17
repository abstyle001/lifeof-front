export interface User {
  id: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
}

export interface ProfileSettings {
  is_public: boolean;
}

export type ProfileSettingsUpdate = ProfileSettings;

export interface ProfileSearchResult {
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
}

export interface PublicAchievement {
  code: string;
  title: string;
  description: string;
  unlocked_at: string;
}

export interface PublicProfile {
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
  attributes: Attributes;
  achievements: PublicAchievement[];
  is_self: boolean;
  is_following: boolean;
  is_followed_by: boolean;
  following_count: number;
  followers_count: number;
}

export type FollowUser = ProfileSearchResult;

export interface FollowAction {
  username: string;
  is_following: boolean;
  followers_count: number;
}

export interface FollowRelation {
  username: string;
  is_self: boolean;
  is_following: boolean;
  is_followed_by: boolean;
  following_count: number;
  followers_count: number;
}

export type FollowListKind = "following" | "followers";

export interface UserUpdateInput {
  username?: string;
  old_password?: string;
  new_password?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DailyRecord {
  id: number;
  date: string;
  sleep: number;
  study_time: number;
  exercise: number;
  mood: number;
  focus: number;
  reading_time: number;
  skill_time: number;
  diet: number;
  stress: number;
  energy: number;
  tasks_completed: number;
  tasks_total: number;
  note: string | null;
}

export type RecordInput = Omit<DailyRecord, "id" | "note"> & {
  note?: string | null;
};

export interface RecordSave extends DailyRecord {
  new_achievements: Achievement[];
}

export interface SocialInteraction {
  id: number;
  date: string;
  interactions: number;
  social_time: number;
  quality: number;
}

export type SocialInput = Omit<SocialInteraction, "id">;

export interface Task {
  id: number;
  date: string;
  title: string;
  done: boolean;
  importance: "high" | "medium" | "low";
}

export type TaskInput = Omit<Task, "id">;

export type TaskUpdate = Partial<Pick<Task, "title" | "done" | "importance">>;

export interface Goal {
  id: number;
  title: string;
  done: boolean;
}

export type GoalInput = Omit<Goal, "id">;

export type GoalUpdate = Partial<Pick<Goal, "title" | "done">>;

export type AttributeKey = "INT" | "VIT" | "FOCUS" | "CHA";

export interface Attributes {
  INT: number;
  VIT: number;
  FOCUS: number;
  CHA: number;
}

export interface AttributeFactor {
  key: string;
  label: string;
  unit: string | null;
  avg: number | null;
  weight: number | null;
  contribution: number;
  kind: "linear" | "bonus";
  detail: string | null;
  cap: number | null;
}

export interface AttributeExplanation {
  key: AttributeKey;
  label: string;
  zh: string;
  value: number;
  base: number;
  factors: AttributeFactor[];
  source: "formula" | "social" | "proxy";
  note: string | null;
}

export interface AttributesExplain {
  attributes: AttributeExplanation[];
  window_days: number;
  record_count: number;
  has_social: boolean;
}

export interface TodayStatus {
  score: number;
  tasks_completed: number;
  tasks_total: number;
}

export interface TrendPoint {
  date: string;
  study_time: number;
  sleep: number;
  exercise: number;
  reading_time: number;
  skill_time: number;
  mood: number;
  focus: number;
  diet: number;
  stress: number;
  energy: number;
  tasks_completed: number;
  tasks_total: number;
}

export interface Dashboard {
  user: User;
  attributes: Attributes;
  today: TodayStatus | null;
  streak: number;
  total_days: number;
  total_study_hours: number;
  total_exercise_hours: number;
  total_reading_hours: number;
  recent_records: DailyRecord[];
  trend: TrendPoint[];
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  unlocked_at: string | null;
  requirement: string;
  progress: number | null;
}

export interface AchievementsResponse {
  unlocked: Achievement[];
  locked: Achievement[];
}

export interface ReportItem {
  title: string;
  detail: string;
}

export interface MetricStat {
  key: string;
  label: string;
  unit: string;
  current: number;
  previous: number;
  delta: number;
  delta_pct: number;
}

export interface WeeklyStats {
  days_recorded: number;
  previous_days_recorded: number;
  total_days: number;
  streak: number;
  level: number;
  experience: number;
  attributes: Attributes;
  metrics: MetricStat[];
}

export interface WeeklyReport {
  generated_at: string;
  week_start: string;
  week_end: string;
  stats: WeeklyStats;
  summary: string;
  highlights: ReportItem[];
  concerns: ReportItem[];
  suggestions: ReportItem[];
  next_goal: string;
  prediction: string;
  source: "ai" | "fallback";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WeeklyStatsResponse {
  week_start: string;
  week_end: string;
  stats: WeeklyStats;
}

export interface ChatResponse {
  reply: string;
}

export interface MonthlyStatsResponse {
  month_start: string;
  month_end: string;
  stats: WeeklyStats;
}

export interface MonthlyReport {
  generated_at: string;
  month_start: string;
  month_end: string;
  stats: WeeklyStats;
  summary: string;
  highlights: ReportItem[];
  concerns: ReportItem[];
  suggestions: ReportItem[];
  next_goal: string;
  prediction: string;
  source: "ai" | "fallback";
}

export interface ExportData {
  exported_at: string;
  user: User;
  records: DailyRecord[];
  social: SocialInteraction[];
  achievements: Achievement[];
  goals: Goal[];
  tasks: Task[];
}

export interface ImportData {
  records: RecordInput[];
  social: SocialInput[];
  goals: GoalInput[];
  tasks: TaskInput[];
}

export interface ImportResult {
  records: number;
  social: number;
  goals: number;
  tasks: number;
}

// --- Direct Chat（用户私聊） ---

/** 会话中对方的最小投影（对齐后端 ChatPeerOut）。 */
export interface ChatPeer {
  username: string;
  avatar: string | null;
  level: number;
}

/** 单条私聊消息（对齐后端 DirectMessageOut）。 */
export interface DirectMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string;
  client_message_id: string | null;
}

/** 会话列表项 / 发起会话返回值（对齐后端 ConversationOut）。 */
export interface Conversation {
  id: number;
  peer: ChatPeer;
  last_message: DirectMessage | null;
  last_message_at: string | null;
  unread_count: number;
  peer_last_read_message_id: number | null;
  created_at: string;
}

/** SSE 事件联合类型（对齐后端 routers/chat.py event_gen 的 payload）。 */
export type ChatStreamEvent =
  | { type: "connected"; user_id: number }
  | { type: "message.new"; conversation_id: number; message: DirectMessage }
  | {
      type: "message.read";
      conversation_id: number;
      reader_id: number;
      message_id: number;
    }
  | { type: "conversation.hidden"; conversation_id: number };

export interface UnreadCount {
  total: number;
}
