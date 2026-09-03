export interface User {
  id: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
}

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
