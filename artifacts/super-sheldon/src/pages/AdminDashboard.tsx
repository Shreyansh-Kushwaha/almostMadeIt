import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClassPulse } from "@/lib/classpulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import ChurnAlertsPanel from "@/components/ChurnAlertsPanel";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Building2, Users, ShieldAlert, Percent, TrendingDown, Search } from "lucide-react";

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
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const teachersQ = useQuery({ queryKey: ["admin-teachers"], queryFn: () => ClassPulse.adminTeachers() });
  const studentsQ = useQuery({ queryKey: ["admin-students"], queryFn: () => ClassPulse.adminStudents() });
  const retentionQ = useQuery({ queryKey: ["admin-retention"], queryFn: () => ClassPulse.adminRetention() });

  const retention = retentionQ.data;
  const teachers = teachersQ.data ?? [];
  const students = studentsQ.data ?? [];

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.teacher.name.toLowerCase().includes(q) ||
        t.teacher.subject.toLowerCase().includes(q) ||
        (t.teacher.email ?? "").toLowerCase().includes(q),
    );
  }, [teachers, teacherSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student.name.toLowerCase().includes(q) ||
        (s.student.subject ?? "").toLowerCase().includes(q) ||
        (s.student.grade ?? "").toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

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
          <CardTitle className="flex items-center justify-between flex-wrap gap-3">
            <span>Teacher Performance · {teachers.length} total</span>
            {teachersQ.isFetching && !teachersQ.isLoading && (
              <span className="text-xs text-primary/80 animate-pulse font-normal">Refreshing…</span>
            )}
          </CardTitle>
          <div className="relative mt-2 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search teacher by name, subject or email…"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="pl-9 bg-card/60 border-white/10 h-8 text-sm"
              data-testid="input-admin-teacher-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {teachersQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {teacherSearch ? `No teachers match "${teacherSearch}"` : "No teacher data available."}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Teacher</th>
                    <th className="text-left font-medium">Subject</th>
                    <th className="text-right font-medium">Classes</th>
                    <th className="text-right font-medium">Avg Engagement</th>
                    <th className="text-right font-medium">Avg Understanding</th>
                    <th className="text-right font-medium">Churn Risk Avg</th>
                    <th className="text-right font-medium">Sessions 30d</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((t) => (
                    <tr key={t.teacher.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{t.teacher.name}</td>
                      <td className="text-muted-foreground">{t.teacher.subject}</td>
                      <td className="text-right font-mono">{t.teacher.totalClasses}</td>
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
          <CardTitle className="flex items-center justify-between flex-wrap gap-3">
            <span>Student Roster · {students.length} total</span>
            {studentsQ.isFetching && !studentsQ.isLoading && (
              <span className="text-xs text-primary/80 animate-pulse font-normal">Refreshing…</span>
            )}
          </CardTitle>
          <div className="relative mt-2 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student by name, subject or grade…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9 bg-card/60 border-white/10 h-8 text-sm"
              data-testid="input-admin-student-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {studentsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {studentSearch ? `No students match "${studentSearch}"` : "No student data available."}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
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
                  {filteredStudents.map((s) => (
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
