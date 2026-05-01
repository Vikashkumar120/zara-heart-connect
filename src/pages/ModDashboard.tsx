import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, Ban, VolumeX, Trash2, Activity, Search, ArrowLeft, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

interface ModEvent {
  id: string;
  chat_id: number;
  telegram_user_id: number;
  first_name: string;
  event_type: string;
  reason: string;
  message_text: string;
  created_at: string;
}

interface ModWarning {
  id: string;
  chat_id: number;
  telegram_user_id: number;
  first_name: string;
  warning_count: number;
  mute_count: number;
  ban_count: number;
  last_reason: string;
  updated_at: string;
}

interface GroupChat {
  chat_id: number;
  chat_title: string;
}

const eventIcons: Record<string, any> = {
  warn: AlertTriangle,
  abuse: AlertTriangle,
  spam: Trash2,
  scam: Shield,
  mute: VolumeX,
  ban: Ban,
  flood: Activity,
  delete: Trash2,
  blacklist: Shield,
  unwarn: AlertTriangle,
  unmute: VolumeX,
  resetwarns: Shield,
};

const eventColors: Record<string, string> = {
  warn: "bg-yellow-500/20 text-yellow-400",
  abuse: "bg-red-500/20 text-red-400",
  spam: "bg-orange-500/20 text-orange-400",
  scam: "bg-red-600/20 text-red-300",
  mute: "bg-blue-500/20 text-blue-400",
  ban: "bg-red-700/20 text-red-300",
  flood: "bg-cyan-500/20 text-cyan-400",
  delete: "bg-gray-500/20 text-gray-400",
  blacklist: "bg-purple-500/20 text-purple-400",
  unwarn: "bg-green-500/20 text-green-400",
  unmute: "bg-green-500/20 text-green-400",
  resetwarns: "bg-green-500/20 text-green-400",
};

export default function ModDashboard() {
  const [telegramId, setTelegramId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<ModEvent[]>([]);
  const [warnings, setWarnings] = useState<ModWarning[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [stats, setStats] = useState({ warns: 0, mutes: 0, bans: 0, deletes: 0, floods: 0 });

  const loadData = async () => {
    if (!telegramId.trim()) return;
    setLoading(true);
    try {
      // Get bot tokens for this owner
      const { data: bots } = await supabase
        .from("zara_user_bots")
        .select("bot_token")
        .eq("owner_telegram_user_id", parseInt(telegramId));

      const tokens = (bots || []).map((b: any) => b.bot_token);

      // Also include main Zara bot events (no bot_token filter for main bot)
      // Get all groups
      const { data: groupData } = await supabase.from("zara_group_chats").select("chat_id,chat_title");
      setGroups(groupData || []);

      // Get events for these bot tokens
      let allEvents: ModEvent[] = [];
      let allWarnings: ModWarning[] = [];

      for (const token of tokens) {
        const { data: evts } = await supabase
          .from("zara_mod_events")
          .select("*")
          .eq("bot_token", token)
          .order("created_at", { ascending: false })
          .limit(100);
        if (evts) allEvents.push(...(evts as ModEvent[]));

        const { data: wrns } = await supabase
          .from("zara_mod_warnings")
          .select("*")
          .eq("bot_token", token)
          .order("warning_count", { ascending: false })
          .limit(50);
        if (wrns) allWarnings.push(...(wrns as ModWarning[]));
      }

      // Sort events by date
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents);
      setWarnings(allWarnings);

      // Calculate stats
      const s = { warns: 0, mutes: 0, bans: 0, deletes: 0, floods: 0 };
      allEvents.forEach((e) => {
        if (e.event_type === "warn" || e.event_type === "abuse" || e.event_type === "spam" || e.event_type === "scam") s.warns++;
        if (e.event_type === "mute") s.mutes++;
        if (e.event_type === "ban") s.bans++;
        if (e.event_type === "delete") s.deletes++;
        if (e.event_type === "flood") s.floods++;
      });
      setStats(s);
      setLoaded(true);
    } catch (e) {
      console.error("Dashboard load error:", e);
    }
    setLoading(false);
  };

  const getGroupName = (chatId: number) => {
    const g = groups.find((g) => g.chat_id === chatId);
    return g?.chat_title || `Chat ${chatId}`;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              Zara Mod Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Apne bots ke moderation logs, stats aur offenders dekho 💖</p>
          </div>
        </div>

        {/* Myra AI Coming Soon Banner */}
        <Card className="border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-accent/20">
              <Smartphone className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-lg">Myra AI Assistant for Android 🚀</h3>
              <p className="text-muted-foreground text-sm">Coming Soon! Tumhara personal AI assistant — ab phone pe bhi! Stay tuned 💕</p>
            </div>
            <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">COMING SOON</Badge>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                placeholder="Apna Telegram User ID dalo..."
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="flex-1"
                type="number"
              />
              <Button onClick={loadData} disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                {loading ? "Loading..." : "Load Stats"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">💡 Telegram ID kaise pata kare? @userinfobot ko msg karo Telegram pe!</p>
          </CardContent>
        </Card>

        {loaded && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Warnings", value: stats.warns, icon: AlertTriangle, color: "text-yellow-400" },
                { label: "Mutes", value: stats.mutes, icon: VolumeX, color: "text-blue-400" },
                { label: "Bans", value: stats.bans, icon: Ban, color: "text-red-400" },
                { label: "Deleted", value: stats.deletes, icon: Trash2, color: "text-gray-400" },
                { label: "Floods", value: stats.floods, icon: Activity, color: "text-cyan-400" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="events">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="events">📋 Recent Events</TabsTrigger>
                <TabsTrigger value="offenders">🔥 Top Offenders</TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Moderation Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Koi events nahi mili! Sab clean hai 💖</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Group</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>When</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {events.slice(0, 50).map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>
                                  <Badge className={eventColors[e.event_type] || "bg-muted text-muted-foreground"}>
                                    {e.event_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{e.first_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{getGroupName(e.chat_id)}</TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate">{e.reason}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{timeAgo(e.created_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="offenders" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Offenders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {warnings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Koi warned users nahi! 💖</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Group</TableHead>
                              <TableHead>⚠️ Warns</TableHead>
                              <TableHead>🔇 Mutes</TableHead>
                              <TableHead>🚫 Bans</TableHead>
                              <TableHead>Last Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {warnings.map((w, i) => (
                              <TableRow key={w.id}>
                                <TableCell className="font-bold">{i + 1}</TableCell>
                                <TableCell className="font-medium">{w.first_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{getGroupName(w.chat_id)}</TableCell>
                                <TableCell>
                                  <Badge className="bg-yellow-500/20 text-yellow-400">{w.warning_count}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-500/20 text-blue-400">{w.mute_count}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-red-500/20 text-red-400">{w.ban_count}</Badge>
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate">{w.last_reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}