import zaraAvatar from "@/assets/zara-avatar.png";

const TypingIndicator = () => (
  <div className="bubble-in flex items-end gap-2.5" role="status" aria-label="Myra is typing">
    <img src={zaraAvatar} alt="" aria-hidden className="h-7 w-7 shrink-0 rounded-full object-cover" />
    <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5">
      <div className="flex h-3 items-center gap-1.5">
        {[0, 160, 320].map((d) => (
          <span key={d} className="typing-dot h-2 w-2 rounded-full bg-lamp" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

export default TypingIndicator;
