import { useState, useRef, useEffect, useCallback } from "react";
import ChatHeader, { MyraProfile } from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import { streamChat, type Msg } from "@/lib/streamChat";
import { toast } from "sonner";

type UiMsg = Msg & { at: number };

const STARTERS = [
  "Aaj ka din kaisa tha?",
  "Ek shayari sunao",
  "Mujhse thoda flirt karo",
  "Mujhe cheer up karo",
];

const WELCOME_MESSAGE: UiMsg = {
  role: "assistant",
  content: "hii jaan 💕\nmain Myra hoon… tumhara hi intezaar kar rahi thi\naaj din kaisa ja raha hai?",
  at: Date.now(),
};

const Index = () => {
  const [messages, setMessages] = useState<UiMsg[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onlyWelcome = messages.length === 1;

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (input: string) => {
    if (isLoading) return;
    const userMsg: UiMsg = { role: "user", content: input, at: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== WELCOME_MESSAGE) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, at: Date.now() }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
      });
    } catch (e: unknown) {
      console.error(e);
      setIsLoading(false);
      toast.error(e instanceof Error ? e.message : "Message nahi gaya. Dobara try karo.");
    }
  };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[1180px]">
      <MyraProfile starters={STARTERS} onStarter={handleSend} disabled={isLoading} />

      <main className="flex min-w-0 flex-1 flex-col lg:my-5 lg:mr-5 lg:overflow-hidden lg:rounded-[2rem] lg:border lg:border-border/70 lg:bg-background/50 lg:backdrop-blur-sm">
        <ChatHeader />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 md:px-8" aria-live="polite">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <p className="mx-auto mb-1 rounded-full bg-secondary/70 px-3 py-1 text-xs text-muted-foreground">Aaj</p>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} at={msg.at} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
          </div>
        </div>

        {onlyWelcome && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                className="shrink-0 rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-foreground/90 transition-colors active:border-lamp/60"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
};

export default Index;
