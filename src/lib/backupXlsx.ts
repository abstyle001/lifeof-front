import * as XLSX from "xlsx";
import type {
  ExportData,
  ImportData,
  RecordInput,
  SocialInput,
  GoalInput,
  TaskInput,
} from "./types";

export type ImportCounts = { records: number; social: number; goals: number; tasks: number };

export interface PendingImport {
  payload: ImportData;
  counts: ImportCounts;
}

/** 工作簿中各类数据的 sheet 名（含别名，兼容手工改名）。 */
const SHEET_NAMES: Record<"records" | "social" | "goals" | "tasks", string[]> = {
  records: ["每日记录", "记录", "records"],
  social: ["社交", "social"],
  goals: ["目标", "goals"],
  tasks: ["任务", "tasks"],
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Excel 1900 日期系统：1970-01-01 对应的序列号（SheetJS 已处理 1900 闰年 bug）。 */
const EXCEL_EPOCH_SERIAL = 25569;

function serialToDateString(serial: number): string | undefined {
  const ms = (serial - EXCEL_EPOCH_SERIAL) * 86_400_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return undefined;
  // 以 UTC 分量还原日历日，避免本地时区偏移
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 把 Excel 中的日期（文本 / 序列号 / Date 对象）归一化为 YYYY-MM-DD。 */
function toDateString(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // 用本地日期分量，避免 toISOString() 的 UTC 转换导致跨时区日期偏移一天
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === "number") {
    return serialToDateString(value);
  }
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  }
  return undefined;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "yes", "是", "1"].includes(s)) return true;
    if (["false", "no", "否", "0", ""].includes(s)) return false;
  }
  return fallback;
}

function toImportance(value: unknown): "high" | "medium" | "low" {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (s === "high" || s === "高") return "high";
  if (s === "low" || s === "低") return "low";
  return "medium";
}

function rowsOf(wb: XLSX.WorkBook, names: string[]): Record<string, unknown>[] {
  const sheetName = names.find((n) => wb.SheetNames.includes(n));
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: undefined });
}

function mapRecords(rows: Record<string, unknown>[]): RecordInput[] {
  const out: RecordInput[] = [];
  for (const r of rows) {
    const date = toDateString(r.date ?? r.Date);
    if (!date) continue;
    const tasksCompleted = Math.max(0, Math.trunc(toNumber(r.tasks_completed, 0)));
    const tasksTotal = Math.max(
      tasksCompleted,
      Math.trunc(toNumber(r.tasks_total, tasksCompleted)),
    );
    out.push({
      date,
      sleep: toNumber(r.sleep, 0),
      study_time: toNumber(r.study_time, 0),
      exercise: toNumber(r.exercise, 0),
      mood: Math.trunc(toNumber(r.mood, 0)),
      focus: Math.trunc(toNumber(r.focus, 0)),
      reading_time: toNumber(r.reading_time, 0),
      skill_time: toNumber(r.skill_time, 0),
      diet: Math.trunc(toNumber(r.diet, 0)),
      stress: Math.trunc(toNumber(r.stress, 0)),
      energy: Math.trunc(toNumber(r.energy, 0)),
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      note: typeof r.note === "string" && r.note !== "" ? r.note : null,
    });
  }
  return out;
}

function mapSocial(rows: Record<string, unknown>[]): SocialInput[] {
  const out: SocialInput[] = [];
  for (const r of rows) {
    const date = toDateString(r.date ?? r.Date);
    if (!date) continue;
    out.push({
      date,
      interactions: Math.max(0, Math.trunc(toNumber(r.interactions, 0))),
      social_time: toNumber(r.social_time, 0),
      quality: Math.trunc(toNumber(r.quality, 0)),
    });
  }
  return out;
}

function mapGoals(rows: Record<string, unknown>[]): GoalInput[] {
  const out: GoalInput[] = [];
  for (const r of rows) {
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;
    out.push({ title, done: toBoolean(r.done, false) });
  }
  return out;
}

function mapTasks(rows: Record<string, unknown>[]): TaskInput[] {
  const out: TaskInput[] = [];
  for (const r of rows) {
    const date = toDateString(r.date ?? r.Date);
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!date || !title) continue;
    out.push({
      date,
      title,
      done: toBoolean(r.done, false),
      importance: toImportance(r.importance),
    });
  }
  return out;
}

/** xlsx（ZIP）与旧版 xls（OLE2）的魔数前缀。 */
function isExcelBinary(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return true; // PK\x03\x04
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return true;
  }
  return false;
}

/**
 * 解析备份工作簿（.xlsx），返回可提交给 /api/import 的载荷与数量摘要。
 * 宽容地接受本应用导出的文件或手工整理的同构 Excel。
 */
export function parseBackupWorkbook(buffer: ArrayBuffer): PendingImport {
  if (!isExcelBinary(buffer)) {
    throw new Error("文件不是有效的 Excel 工作簿");
  }
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    throw new Error("文件不是有效的 Excel 工作簿");
  }

  const records = mapRecords(rowsOf(wb, SHEET_NAMES.records));
  const social = mapSocial(rowsOf(wb, SHEET_NAMES.social));
  const goals = mapGoals(rowsOf(wb, SHEET_NAMES.goals));
  const tasks = mapTasks(rowsOf(wb, SHEET_NAMES.tasks));

  const total = records.length + social.length + goals.length + tasks.length;
  if (total === 0) {
    throw new Error("文件中没有可导入的数据（请确认包含“每日记录 / 社交 / 目标 / 任务”工作表）");
  }

  return {
    payload: { records, social, goals, tasks },
    counts: {
      records: records.length,
      social: social.length,
      goals: goals.length,
      tasks: tasks.length,
    },
  };
}

/** 把导出数据构造成多工作表 .xlsx 的字节（ArrayBuffer），供前端下载。 */
export function buildBackupWorkbook(data: ExportData): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const append = (name: string, rows: unknown[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  };

  append("每日记录", data.records);
  append("社交", data.social);
  append("成就", data.achievements);
  append("目标", data.goals);
  append("任务", data.tasks);

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
