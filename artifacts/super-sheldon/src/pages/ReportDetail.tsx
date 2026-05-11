import { useMemo, useState } from "react";
import { useParams } from "wouter";
import {
  useGetReport,
  useRenderReportPdf,
  useSendReportEmail,
  useGetMe,
  getGetReportQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BrainCircuit, ThumbsUp, TrendingUp, AlertTriangle,
  Download, Mail, Loader2, User2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import MoodTimeline, { type MoodPoint } from "@/components/MoodTimeline";

// Declared OUTSIDE the component so its identity is stable across renders —
// otherwise every dialog toggle / mutation state change remounts every card,
// which reads as the page "glitching."
function ScoreCard({ title, score }: { title: string; score: number }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="text-sm text-muted-foreground mb-2">{title}</div>
        <div className="text-3xl font-bold text-primary">
          {score}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportDetail() {
  const { reportId } = useParams();
  const id = Number(reportId);
  const queryKey = useMemo(() => getGetReportQueryKey(id), [id]);
  const { data: report, isLoading } = useGetReport(id, {
    query: { enabled: Number.isFinite(id), queryKey },
  });
  const [downloading, setDownloading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const { data: me } = useGetMe();
  const myEmail = (me as unknown as { email?: string } | undefined)?.email ?? "";

  const renderPdf = useRenderReportPdf();
  const sendEmail = useSendReportEmail({
    mutation: {
      onSuccess: (data) => {
        if (data.status === "sent") {
          toast.success(`Report emailed${data.recipient ? ` to ${data.recipient}` : ""}`);
        } else if (data.status === "skipped") {
          toast.message("Email skipped", { description: data.error ?? "no recipient configured" });
        } else {
          toast.error("Email failed", { description: data.error ?? "unknown error" });
        }
        setSendOpen(false);
      },
      onError: (e: unknown) => {
        toast.error("Email failed", { description: e instanceof Error ? e.message : "Server error" });
      },
    },
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      const { pdfUrl } = await renderPdf.mutateAsync({ reportId: id });
      const cacheBust = `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const a = document.createElement("a");
      a.href = cacheBust;
      a.download = `ClassPulse_Report_${id}.pdf`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error("Download failed", {
        description: e instanceof Error ? e.message : "Unable to render PDF",
      });
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading || !report) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-primary font-medium mb-1 tracking-wider uppercase flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Final Analysis
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{report.class?.studentName} - {report.class?.subject}</h1>
          <p className="text-muted-foreground mt-1">{new Date(report.createdAt).toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || renderPdf.isPending}
              data-testid="button-download-pdf"
            >
              {downloading || renderPdf.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setSendOpen(true)}
              disabled={sendEmail.isPending}
              data-testid="button-send-report-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send report
            </Button>
          </div>
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

      {/* ClassPulse AI scores */}
      {(() => {
        const r = report as any;
        const has =
          r.understandingScore != null || r.satisfactionScore != null ||
          r.teacherCompatibilityScore != null || r.churnRiskScore != null;
        if (!has) return null;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {r.understandingScore != null && <ScoreCard title="Understanding" score={Math.round(r.understandingScore)} />}
            {r.satisfactionScore != null && <ScoreCard title="Satisfaction" score={Math.round(r.satisfactionScore)} />}
            {r.teacherCompatibilityScore != null && <ScoreCard title="Compatibility" score={Math.round(r.teacherCompatibilityScore)} />}
            {r.churnRiskScore != null && <ScoreCard title="Churn Risk" score={Math.round(r.churnRiskScore)} />}
          </div>
        );
      })()}

      {/* Mood timeline (if Azure OpenAI returned one) */}
      {(() => {
        const mood = (report as any).moodTimeline as MoodPoint[] | undefined;
        if (!mood || mood.length === 0) return null;
        return <MoodTimeline data={mood} />;
      })()}

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

      <SendReportDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        defaultEmail={myEmail}
        studentName={report.class?.studentName ?? "Student"}
        subject={report.class?.subject ?? "Class"}
        isPending={sendEmail.isPending}
        onSend={(email) => sendEmail.mutate({ reportId: id, data: email ? { recipientEmail: email } : {} })}
      />
    </div>
  );
}

// ─── Send report dialog ───────────────────────────────────────────────────────

function SendReportDialog({
  open,
  onOpenChange,
  defaultEmail,
  studentName,
  subject,
  isPending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEmail: string;
  studentName: string;
  subject: string;
  isPending: boolean;
  onSend: (email: string) => void;
}) {
  const [mode, setMode] = useState<"mine" | "custom">("mine");
  const [custom, setCustom] = useState("");

  // Reset state every time the dialog opens so a previous custom address
  // doesn't linger.
  function handleOpenChange(next: boolean) {
    if (next) {
      setMode("mine");
      setCustom("");
    }
    onOpenChange(next);
  }

  const isValidCustom = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custom.trim());
  const canSubmit =
    !isPending && (mode === "mine" ? !!defaultEmail : isValidCustom);

  function submit() {
    if (!canSubmit) return;
    onSend(mode === "mine" ? "" : custom.trim());
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send report
          </DialogTitle>
          <DialogDescription>
            Email the PDF for <span className="text-foreground font-medium">{studentName} — {subject}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              mode === "mine"
                ? "border-primary/60 bg-primary/5"
                : "border-white/10 hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name="send-mode"
              checked={mode === "mine"}
              onChange={() => setMode("mine")}
              className="accent-primary"
              data-testid="radio-send-mine"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User2 className="w-4 h-4" /> My email
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {defaultEmail || "No email on file for your account"}
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              mode === "custom"
                ? "border-primary/60 bg-primary/5"
                : "border-white/10 hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name="send-mode"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
              className="mt-1 accent-primary"
              data-testid="radio-send-custom"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium mb-2">Send to a custom address</div>
              <Input
                type="email"
                placeholder="name@example.com"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  if (mode !== "custom") setMode("custom");
                }}
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="h-9"
                data-testid="input-send-custom"
              />
              {mode === "custom" && custom.trim() && !isValidCustom && (
                <p className="text-[11px] text-rose-400 mt-1">Enter a valid email address.</p>
              )}
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            data-testid="button-send-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            data-testid="button-send-confirm"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
