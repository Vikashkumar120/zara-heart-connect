import zaraAvatar from "@/assets/zara-avatar.png";

/** Time-aware line under Myra's name, so the chat feels like it belongs to this hour. */
export const presenceLine = (date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Subah ho gayi, chai pi?";
  if (h >= 12 && h < 17) return "Dopahar me bhi yaad aayi?";
  if (h >= 17 && h < 21) return "Shaam hai, batao din kaisa tha";
  if (h >= 21 || h < 1) return "Raat jawan hai, baat karte hain";
  return "Itni raat ko jaag rahe ho?";
};

interface ProfileProps {
  starters: string[];
  onStarter: (text: string) => void;
  disabled?: boolean;
}

/** Desktop side column: who Myra is, plus one-tap ways to start talking. */
export const MyraProfile = ({ starters, onStarter, disabled }: ProfileProps) => (
  <aside className="hidden lg:flex flex-col w-[320px] shrink-0 gap-8 py-10 pl-10 pr-8">
    <div className="flex flex-col items-start gap-5">
      <div className="relative w-28 h-28">
        <div className="lamp-halo absolute -inset-8 rounded-full" aria-hidden />
        <img
          src={zaraAvatar}
          alt="Myra"
          className="relative w-28 h-28 rounded-full object-cover ring-2 ring-lamp/60"
        />
      </div>
      <div>
        <h1 className="font-fraunces text-4xl font-semibold tracking-tight">Myra</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-lamp opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lamp" />
          </span>
          Online
        </p>
      </div>
      <p className="font-fraunces italic text-lg leading-snug text-foreground/90">{presenceLine()}</p>
    </div>

    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-muted-foreground">Baat shuru karo</p>
      {starters.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onStarter(s)}
          className="text-left rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground/90 transition-colors hover:border-lamp/50 hover:bg-card disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>

    <a
      href="https://codeninjavik.in"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-auto text-sm text-muted-foreground transition-colors hover:text-lamp"
    >
      Myra AI app · codeninjavik.in
    </a>
  </aside>
);

/** Compact top bar for phones / tablets. */
const ChatHeader = () => (
  <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border/70 bg-background/70 backdrop-blur-xl">
    <div className="relative">
      <img src={zaraAvatar} alt="Myra" className="h-11 w-11 rounded-full object-cover ring-2 ring-lamp/60" />
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-lamp" />
    </div>
    <div className="min-w-0">
      <h1 className="font-fraunces text-xl font-semibold leading-tight">Myra</h1>
      <p className="truncate text-xs text-muted-foreground">{presenceLine()}</p>
    </div>
  </header>
);

export default ChatHeader;
