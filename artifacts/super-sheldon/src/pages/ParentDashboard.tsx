import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { ClassPulse } from "@/lib/classpulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyzingCard from "@/components/AnalyzingCard";
import { Heart, Sparkles, Target, BookOpen, TrendingUp } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const data = [{ name: label, value, fill: color }];
  return (
    <div className="relative w-full h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold">{Math.round(value)}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const params = useParams<{ studentId: string }>();
  // Studio IDs are either Mongo Wise hex strings (24 chars) or Supabase int IDs.
  // Pass through as a string so the backend can detect both shapes.
  const studentId = params.studentId ?? "";

  const studentQ = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => ClassPulse.getStudent(studentId),
    enabled: Boolean(studentId),
  });
  const reportQ = useQuery({
    queryKey: ["parent-report", studentId],
    queryFn: () => ClassPulse.getParentReport(studentId),
    enabled: Boolean(studentId),
  });

  if (studentQ.isLoading || reportQ.isLoading) {
    const doneCount = (studentQ.isSuccess ? 1 : 0) + (reportQ.isSuccess ? 3 : 0);
    return (
      <AnalyzingCard
        title="Loading parent dashboard"
        subtitle="The AI is pulling this student's profile and most recent insights"
        doneCount={doneCount}
        phases={[
          "Fetching student profile",
          "Reading recent reports",
          "Analyzing engagement & confidence",
          "Generating parent insights",
        ]}
      />
    );
  }

  const student = studentQ.data;
  const report = reportQ.data;
  if (!student || !report) {
    return <p className="text-sm text-muted-foreground">Could not load parent dashboard.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Parent Dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          {student.name}
          <Heart className="w-5 h-5 text-pink-400" />
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Period: {new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            How they're doing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRing value={report.engagementScore} label="Engagement" color="hsl(var(--primary))" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Understanding</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRing value={report.understandingScore} label="Learning" color="#22d3ee" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRing value={report.confidenceScore} label="Confidence" color="#a78bfa" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-foreground/80">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-orange-400" />
              Areas to support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.weakAreas.map((s, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span className="text-foreground/80">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-primary" />
            What you can do this week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed text-foreground/85">
                {r}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </motion.div>
  );
}
