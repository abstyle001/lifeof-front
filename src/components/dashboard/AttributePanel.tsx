import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ATTR_KEYS, ATTR_META } from "@/lib/attributes";
import type { Attributes } from "@/lib/types";

export function AttributePanel({ attributes }: { attributes: Attributes }) {
  return (
    <Card className="p-6">
      <h3 className="mb-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        属性面板
      </h3>
      <div className="space-y-5">
        {ATTR_KEYS.map((key) => {
          const meta = ATTR_META[key];
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">
                  <span className="font-mono font-bold" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {meta.zh} · {meta.desc}
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold">{attributes[key]}</span>
              </div>
              <Progress value={attributes[key]} indicatorStyle={{ backgroundColor: meta.color }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
