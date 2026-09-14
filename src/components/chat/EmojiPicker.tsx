import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS =
  "😀😃😄😁😆😅😂🤣😊😇🙂😉😍🥰😘😗😋😜🤪😝🤑🤗🤭🤫🤔😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😒😓😔😕🙃🫠😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳😵😡😠🤬😷🤒🤕🤢🤮🥴🤠🥳😎🤓🧐👍👎👌✌️🤞🤟🤘👏🙌👐🤝🙏💪🫶❤️🧡💛💚💙💜🖤🤍💔💕💖💗💘💝✨⭐🔥💯🎉🎊👀💀👻🤖💩🐱🐶🌸☀️🌙☕🍺🍕✅❌❓💤🌹🍀".match(
    /\p{Extended_Pictographic}\uFE0F?/gu,
  ) ?? [];

type EmojiPickerProps = {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
};

export function EmojiPicker({ disabled, onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="absolute inset-y-0 right-0 flex items-center pr-1">
      <button
        type="button"
        disabled={disabled}
        aria-label="表情"
        aria-expanded={open}
        title="表情"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-[calc(100%+8px)] z-50 w-72 rounded-xl border border-border bg-popover p-2 shadow-lg">
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
            {EMOJIS.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-secondary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
