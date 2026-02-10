import { motion } from "framer-motion";
import zaraAvatar from "@/assets/zara-avatar.png";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isZara = role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isZara ? "justify-start" : "justify-end"}`}
    >
      {isZara && (
        <img
          src={zaraAvatar}
          alt="Zara AI"
          className="w-8 h-8 rounded-full avatar-glow flex-shrink-0 mt-1"
        />
      )}
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 whitespace-pre-line text-sm leading-relaxed ${
          isZara
            ? "bg-secondary message-glow text-secondary-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}
      >
        {content}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
