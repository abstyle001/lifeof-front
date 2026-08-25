import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { ATTR_KEYS, ATTR_META } from "@/lib/attributes";
import type { Attributes } from "@/lib/types";

export function AttributeRadar({ attributes }: { attributes: Attributes }) {
  const data = ATTR_KEYS.map((key) => ({
    subject: ATTR_META[key].label,
    zh: ATTR_META[key].zh,
    value: attributes[key],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="78%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{
            fill: "var(--muted-foreground)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        />
        <Radar
          name="属性"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="var(--primary)"
          fillOpacity={0.32}
          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
