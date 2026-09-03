import { cn } from "@/lib/utils";

export interface ScoreOption {
  value: number;
  emoji: string;
  label: string;
}

export function ScoreButtons({
  options,
  value,
  onChange,
}: {
  options: ScoreOption[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors",
              active ? "border-primary bg-primary/15" : "border-border hover:bg-secondary",
            )}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {opt.emoji}
            </span>
            <span className={cn("text-xs", active ? "text-primary" : "text-muted-foreground")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
