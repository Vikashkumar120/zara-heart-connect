import zaraAvatar from "@/assets/zara-avatar.png";

const TypingIndicator = () => (
  <div className="flex gap-3 items-start">
    <img
      src={zaraAvatar}
      alt="Myra AI"
      className="w-8 h-8 rounded-full avatar-glow flex-shrink-0"
    />
    <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 message-glow">
      <div className="flex gap-1.5 items-center h-5">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: "300ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: "600ms" }} />
      </div>
    </div>
  </div>
);

export default TypingIndicator;
