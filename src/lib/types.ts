export interface User {
  id: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
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
  reading_count: number;
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
}

export interface Dashboard {
  user: User;
  attributes: Attributes;
  today: TodayStatus | null;
  streak: number;
  total_days: number;
  total_study_hours: number;
  total_exercise_hours: number;
  books_read: number;
  recent_records: DailyRecord[];
  trend: TrendPoint[];
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  unlocked_at: string | null;
}

export interface AchievementsResponse {
  unlocked: Achievement[];
  locked: Achievement[];
}
