import { CheckCheck } from "lucide-react";
import zaraAvatar from "@/assets/zara-avatar.png";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /** epoch ms; shown as a small clock under the bubble */
  at?: number;
}

const clock = (at?: number) =>
  at ? new Date(at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase() : "";

const ChatMessage = ({ role, content, at }: ChatMessageProps) => {
  const isMyra = role === "assistant";

  return (
    <div className={`bubble-in flex items-end gap-2.5 ${isMyra ? "justify-start" : "justify-end"}`}>
      {isMyra && (
        <img src={zaraAvatar} alt="" aria-hidden className="mb-5 h-7 w-7 shrink-0 rounded-full object-cover" />
      )}
      <div className={`flex max-w-[82%] flex-col gap-1 md:max-w-[68%] ${isMyra ? "items-start" : "items-end"}`}>
        <div
          className={
            isMyra
              ? "whitespace-pre-line rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-[15px] leading-relaxed text-card-foreground"
              : "whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] font-medium leading-relaxed text-primary-foreground"
          }
        >
          {content}
        </div>
        {at && (
          <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
            {clock(at)}
            {!isMyra && <CheckCheck className="h-3.5 w-3.5 text-lamp" aria-label="Delivered" />}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
