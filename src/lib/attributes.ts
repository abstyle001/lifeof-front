import type { AttributeKey } from "./types";

export interface AttrMeta {
  label: string;
  zh: string;
  desc: string;
  color: string;
}

export const ATTR_META: Record<AttributeKey, AttrMeta> = {
  INT: { label: "INT", zh: "智力", desc: "学习能力", color: "#56b4e9" },
  VIT: { label: "VIT", zh: "体力", desc: "健康状态", color: "#34d399" },
  FOCUS: { label: "FOCUS", zh: "专注", desc: "专注能力", color: "#fbbf24" },
  CHA: { label: "CHA", zh: "社交", desc: "社交能力", color: "#f472b6" },
};

export const ATTR_KEYS: AttributeKey[] = ["INT", "VIT", "FOCUS", "CHA"];
