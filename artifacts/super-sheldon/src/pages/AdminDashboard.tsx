import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClassPulse } from "@/lib/classpulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ChurnAlertsPanel from "@/components/ChurnAlertsPanel";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Building2, Users, ShieldAlert, Percent, TrendingDown } from "lucide-react";

// All bars use the brand orange; intensity steps up with risk so Critical
// reads as "darker / hotter" while staying within the orange family.
function bucketColor(label: string) {
  switch (label) {
    case "Low": return "#FFB066";
    case "Medium": return "#FF9233";
    case "High": return "#FF7A00";
    case "Critical": return "#E55F00";
    default: return "#FF7A00";
  }
}

export default function AdminDashboard() {
  const teachersQ = useQuery({ queryKey: ["admin-teachers"], queryFn: () => ClassPulse.adminTeachers() });
  const studentsQ = useQuery({ queryKey: ["admin-students"], queryFn: () => ClassPulse.adminStudents() });
  const retentionQ = useQuery({ queryKey: ["admin-retention"], queryFn: () => ClassPulse.adminRetention() });

  const retention = retentionQ.data;
  const teachers = teachersQ.data ?? [];
  const students = studentsQ.data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Internal Team</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> ClassPulse Admin
          </h1>
        </div>
      </div>

      {/* KPI strip — each card renders independently from retention query */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {retentionQ.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : retention ? (
          <>
            <Kpi icon={<Users className="w-4 h-4" />} label="Total Students" value={String(retention.totalStudents)} />
            <Kpi icon={<ShieldAlert className="w-4 h-4 text-orange-400" />} label="At-Risk" value={String(retention.atRisk)} />
            <Kpi icon={<TrendingDown className="w-4 h-4 text-red-400" />} label="Churned (30d)" value={String(retention.churned30d)} />
            <Kpi icon={<Percent className="w-4 h-4 text-emerald-400" />} label="Retained Rate" value={`${Math.round(retention.retainedRate * 100)}%`} highlight />
          </>
        ) : (
          <div className="col-span-4 text-sm text-muted-foreground">Could not load retention metrics.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {retentionQ.isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : retention ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retention.riskBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#FF7A00">
                      {retention.riskBuckets.map((b) => (
                        <Cell key={b.label} fill={bucketColor(b.label)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <ChurnAlertsPanel limit={6} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Teacher Performance</span>
            {teachersQ.isFetching && !teachersQ.isLoading && (
              <span className="text-xs text-primary/80 animate-pulse font-normal">Refreshing…</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teachersQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Teacher</th>
                    <th className="text-left font-medium">Subject</th>
                    <th className="text-right font-medium">Avg Engagement</th>
                    <th className="text-right font-medium">Avg Understanding</th>
                    <th className="text-right font-medium">Churn Risk Avg</th>
                    <th className="text-right font-medium">Sessions 30d</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.teacher.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{t.teacher.name}</td>
                      <td className="text-muted-foreground">{t.teacher.subject}</td>
                      <td className="text-right font-mono">{t.avgEngagement}</td>
                      <td className="text-right font-mono">{t.avgUnderstanding}</td>
                      <td className="text-right font-mono text-orange-400">{t.churnRiskAvg}</td>
                      <td className="text-right font-mono">{t.sessionsLast30d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Roster</span>
            {studentsQ.isFetching && !studentsQ.isLoading && (
              <span className="text-xs text-primary/80 animate-pulse font-normal">Refreshing…</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Student</th>
                    <th className="text-left font-medium">Subject</th>
                    <th className="text-right font-medium">Engagement</th>
                    <th className="text-right font-medium">Understanding</th>
                    <th className="text-right font-medium">Churn Risk</th>
                    <th className="text-right font-medium">Last Session</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.student.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{s.student.name}</td>
                      <td className="text-muted-foreground">{s.student.subject ?? "—"}</td>
                      <td className="text-right font-mono">{s.avgEngagement}</td>
                      <td className="text-right font-mono">{s.avgUnderstanding}</td>
                      <td className={`text-right font-mono ${s.churnRiskScore >= 50 ? "text-orange-400" : ""}`}>
                        {s.churnRiskScore}
                      </td>
                      <td className="text-right text-muted-foreground">
                        {s.lastSessionAt ? new Date(s.lastSessionAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`glass-card ${highlight ? "border-primary/50" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
