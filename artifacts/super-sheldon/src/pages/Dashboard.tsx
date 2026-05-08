import { useGetDashboardStats, useGetTeacherRankings, useListClasses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Users, BrainCircuit, Activity, Star, Trophy, Clock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const MOCK_CHART_DATA = [
  { day: "Mon", score: 85 },
  { day: "Tue", score: 88 },
  { day: "Wed", score: 87 },
  { day: "Thu", score: 92 },
  { day: "Fri", score: 95 },
  { day: "Sat", score: 91 },
  { day: "Sun", score: 94 },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: rankings, isLoading: rankingsLoading } = useGetTeacherRankings();
  const { data: classes, isLoading: classesLoading } = useListClasses();

  const upcomingClasses = classes?.filter(c => c.status === "upcoming").slice(0, 3) || [];

  if (statsLoading || rankingsLoading || classesLoading) {
    return <div className="space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const statCards = [
    { title: "Total Classes", value: stats?.totalClasses, change: stats?.totalClassesChange, icon: Users },
    { title: "Avg AI Score", value: stats?.avgAiScore + "%", change: stats?.avgAiScoreChange, icon: BrainCircuit, highlight: true },
    { title: "Avg Engagement", value: stats?.avgEngagement + "%", change: stats?.avgEngagementChange, icon: Activity },
    { title: "Weekly Rating", value: stats?.weeklyRating, change: stats?.weeklyRatingChange, icon: Star },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Card className={`glass-card ${stat.highlight ? 'border-primary/50' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs mt-1 ${Number(stat.change) > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {Number(stat.change) > 0 ? '+' : ''}{stat.change}% from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card col-span-2">
          <CardHeader>
            <CardTitle>AI Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Global Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankings?.slice(0, 5).map((teacher) => (
                  <div key={teacher.rank} className={`flex items-center justify-between p-2 rounded-md ${teacher.isCurrentTeacher ? 'bg-primary/10 border border-primary/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-sm font-bold text-muted-foreground">#{teacher.rank}</div>
                      <div>
                        <div className="text-sm font-medium">{teacher.name}</div>
                        <div className="text-xs text-muted-foreground">{teacher.subject}</div>
                      </div>
                    </div>
                    <div className="font-mono text-sm text-primary">{teacher.score}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingClasses.length === 0 && <p className="text-sm text-muted-foreground">No upcoming classes</p>}
                {upcomingClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{c.studentName}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div className="text-xs px-2 py-1 bg-secondary rounded-md">{c.platform}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
