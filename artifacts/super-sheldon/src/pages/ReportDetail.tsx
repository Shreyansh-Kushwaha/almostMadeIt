import { useParams } from "wouter";
import { useGetReport } from "@workspace/api-client-react";
import { getGetReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { BrainCircuit, ThumbsUp, TrendingUp, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function ReportDetail() {
  const { reportId } = useParams();
  const { data: report, isLoading } = useGetReport(Number(reportId), {
    query: { enabled: !!reportId, queryKey: getGetReportQueryKey(Number(reportId)) }
  });

  if (isLoading || !report) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const ScoreCard = ({ title, score }: { title: string, score: number }) => (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="text-sm text-muted-foreground mb-2">{title}</div>
        <div className="text-3xl font-bold text-primary">{score}<span className="text-lg text-muted-foreground">/100</span></div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-primary font-medium mb-1 tracking-wider uppercase flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Final Analysis
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{report.class?.studentName} - {report.class?.subject}</h1>
          <p className="text-muted-foreground mt-1">{new Date(report.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
          <div className="text-5xl font-black text-primary">{report.overallScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard title="Engagement" score={report.engagementScore} />
        <ScoreCard title="Voice Clarity" score={report.voiceClarityScore} />
        <ScoreCard title="Interaction" score={report.interactionScore} />
        <ScoreCard title="Confidence" score={report.speakingConfidence} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Timeline Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="minute" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}m`} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="voiceClarity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="noise" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-primary" /> AI Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-lg leading-relaxed text-muted-foreground">
            {report.aiSummary}
          </CardContent>
        </Card>

        <Card className="glass-card bg-green-500/5 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500 text-lg"><ThumbsUp className="w-5 h-5" /> Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                  <span className="text-sm">{h}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card bg-orange-500/5 border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500 text-lg"><AlertTriangle className="w-5 h-5" /> Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.improvementAreas.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <span className="text-sm">{h}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-lg"><TrendingUp className="w-5 h-5" /> Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.suggestions.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-sm">{h}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
