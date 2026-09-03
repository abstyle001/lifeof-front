import { cn } from "@/lib/utils";

export interface ChipOption {
  value: number;
  label: string;
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: ChipOption[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
