import { useState } from "react";
import { useListReports, useRenderReportPdf } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BrainCircuit, ChevronRight, Download, Loader2 } from "lucide-react";

export default function Reports() {
  const { data: reports, isLoading } = useListReports();
  const renderPdf = useRenderReportPdf();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function downloadReport(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingId(id);
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
    } catch (err) {
      toast.error("Download failed", {
        description: err instanceof Error ? err.message : "Unable to render PDF",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Reports</h1>
        <p className="text-muted-foreground mt-1">Review post-class analysis and insights.</p>
      </div>

      <div className="grid gap-4">
        {reports?.map((report, i) => (
          <Link key={report.id} href={`/reports/${report.id}`}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="glass-card hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Score Circle */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
                        <circle
                          cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-primary" strokeWidth="6"
                          strokeDasharray="175" strokeDashoffset={175 - (175 * report.overallScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-lg font-bold">{report.overallScore}</span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {report.class?.studentName} - {report.class?.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-xl">
                        {report.aiSummary}
                      </p>
                      <div className="text-xs text-muted-foreground mt-2 flex gap-4">
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-primary" /> Analyzed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => downloadReport(report.id, e)}
                      disabled={downloadingId === report.id}
                      data-testid={`button-download-${report.id}`}
                    >
                      {downloadingId === report.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      PDF
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
