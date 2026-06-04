import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/streamChat";
import { toast } from "sonner";

const WELCOME_MESSAGE: Msg = {
  role: "assistant",
  content: "Hiii jaan! 🥰💖\n\nMain Myra hoon...\ntumhara intezaar kar rahi thi! ✨\n\nBatao na,\naaj tumhara din kaisa ja raha hai? 💕",
};

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (input: string) => {
    const userMsg: Msg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== WELCOME_MESSAGE) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
      });
    } catch (e: any) {
      console.error(e);
      setIsLoading(false);
      toast.error(e.message || "Something went wrong 😢");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader />
      
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-glow-pink/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow-purple/5 rounded-full blur-3xl" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
      
      {/* Watermark */}
      <div className="bg-card/60 backdrop-blur-sm border-t border-border py-2 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          💕 Powered by{" "}
          <span className="font-sacramento text-primary text-sm">Myra AI</span>
          {" "}•{" "}
          <a
            href="https://codeninjavik.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline transition-colors"
          >
            codeninjavik.in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Index;
