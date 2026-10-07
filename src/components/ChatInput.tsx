import { useState, useRef, useEffect } from "react";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = input.trim().length > 0 && !disabled;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  return (
    <div className="px-3 pb-3 pt-2 md:px-5 md:pb-5" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="flex items-end gap-2 rounded-[1.6rem] border border-border bg-card/90 p-1.5 pl-4 backdrop-blur-xl transition-colors focus-within:border-lamp/60">
        <label htmlFor="chat-input" className="sr-only">Myra ko message likho</label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Kuch likho Myra ke liye…"
          disabled={disabled}
          rows={1}
          className="min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-95 disabled:bg-secondary disabled:text-muted-foreground"
        >
          <SendHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
