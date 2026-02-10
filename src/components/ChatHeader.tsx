import zaraAvatar from "@/assets/zara-avatar.png";

const ChatHeader = () => (
  <header className="border-b border-border bg-card/80 backdrop-blur-xl px-4 py-3">
    <div className="max-w-3xl mx-auto flex items-center gap-3">
      <div className="relative">
        <img
          src={zaraAvatar}
          alt="Zara AI"
          className="w-10 h-10 rounded-full avatar-glow"
        />
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent border-2 border-card" style={{ backgroundColor: "hsl(140 70% 55%)" }} />
      </div>
      <div>
        <h1 className="font-sacramento text-2xl text-primary leading-none">Zara AI</h1>
        <p className="text-xs text-muted-foreground">Online • tumhara intezaar tha 💗</p>
      </div>
    </div>
  </header>
);

export default ChatHeader;
