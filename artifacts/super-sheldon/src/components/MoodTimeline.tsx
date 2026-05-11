import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity } from "lucide-react";

export interface MoodPoint {
  minute: number;
  mood: string;
  valence: number;
  energy: number;
}

export default function MoodTimeline({ data }: { data: MoodPoint[] }) {
  const safe = (data ?? []).map((d) => ({
    minute: d.minute,
    energy: Math.round((d.energy ?? 0) * 100),
    valence: Math.round((((d.valence ?? 0) + 1) / 2) * 100),
    mood: d.mood,
  }));

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Emotional Energy Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safe}>
              <defs>
                <linearGradient id="moodEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="moodValence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="minute" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 12 }}
                labelFormatter={(m) => `Minute ${m}`}
                formatter={(v: number, key) => [`${v}`, key === "energy" ? "Energy" : "Valence"]}
              />
              <Area type="monotone" dataKey="energy" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#moodEnergy)" />
              <Area type="monotone" dataKey="valence" stroke="#22d3ee" strokeWidth={2} fill="url(#moodValence)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {safe.slice(-6).map((p) => (
            <span key={p.minute} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              m{p.minute}: {p.mood}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
