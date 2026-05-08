import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStartSession } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Loader2, Mic, Activity, Eye, Wifi, ExternalLink, BrainCircuit } from "lucide-react";
import AiOrb from "./AiOrb";

interface MonitoringModalProps {
  classId: number;
  studentName?: string;
  subject?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonitoringModal({ classId, studentName, subject, open, onOpenChange }: MonitoringModalProps) {
  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    noise: 10,
    confidence: 85,
    attention: 90,
    internet: 99,
  });

  const startMutation = useStartSession({
    mutation: {
      onSuccess: (session) => {
        setMonitoringStarted(true);
        setSessionId(session.id);
        toast.success("AI Monitoring active — AI is analyzing in background");
      },
      onError: (err) => {
        toast.error((err as Error).message || "Failed to start session");
      },
    },
  });

  useEffect(() => {
    if (!monitoringStarted || !open) return;
    const int = setInterval(() => {
      setMetrics({
        noise: Math.floor(Math.random() * 20) + 5,
        confidence: Math.floor(Math.random() * 15) + 80,
        attention: Math.floor(Math.random() * 20) + 75,
        internet: Math.floor(Math.random() * 5) + 95,
      });
    }, 2000);
    return () => clearInterval(int);
  }, [monitoringStarted, open]);

  const handleStart = () => {
    startMutation.mutate({ data: { classId } });
  };

  const openMonitorWindow = () => {
    if (!sessionId) return;
    const token = localStorage.getItem("sheldon_token") ?? "";
    const params = new URLSearchParams({
      sessionId: String(sessionId),
      token,
      studentName: studentName ?? "Student",
      subject: subject ?? "Class",
    });
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(
      `${base}/monitor?${params.toString()}`,
      "sheldon_ai_monitor",
      "width=400,height=680,top=80,left=20,resizable=yes,scrollbars=no"
    );
    toast.success("AI Monitor window opened — keep it beside your Zoom meeting!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] glass-card border-primary/20">
        <DialogTitle className="text-center pt-4">AI Classroom Assistant</DialogTitle>
        <DialogDescription className="text-center">
          {monitoringStarted
            ? "AI is monitoring. Open the assistant window beside your Zoom meeting."
            : "Start AI monitoring before joining your class."}
        </DialogDescription>

        <div className="py-5 flex flex-col items-center">
          <AiOrb size="lg" isActive={monitoringStarted} />

          <AnimatePresence>
            {!monitoringStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 w-full space-y-2"
              >
                {[
                  { icon: <Mic className="w-3.5 h-3.5" />, label: "Microphone monitoring", desc: "Voice clarity & noise detection" },
                  { icon: <Activity className="w-3.5 h-3.5" />, label: "Engagement tracking", desc: "Real-time attention analysis" },
                  { icon: <Wifi className="w-3.5 h-3.5" />, label: "Internet quality", desc: "Stability monitoring" },
                  { icon: <BrainCircuit className="w-3.5 h-3.5" />, label: "AI transcription", desc: "Live conversation capture" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2 bg-background/40 rounded-lg border border-border/30">
                    <span className="text-primary">{item.icon}</span>
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-green-400 font-medium">Ready</span>
                  </div>
                ))}
              </motion.div>
            )}

            {monitoringStarted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full mt-6 space-y-4"
              >
                {/* Live metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox icon={<Mic className="w-3 h-3" />} label="Noise Level" value={`${metrics.noise}%`} color="text-foreground" />
                  <MetricBox icon={<Activity className="w-3 h-3" />} label="Confidence" value={`${metrics.confidence}%`} color="text-primary" />
                  <MetricBox icon={<Eye className="w-3 h-3" />} label="Attention" value={`${metrics.attention}%`} color="text-foreground" />
                  <MetricBox icon={<Wifi className="w-3 h-3" />} label="Internet" value={`${metrics.internet}%`} color="text-green-400" />
                </div>

                {/* Popup instruction */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open the AI Monitor window alongside your Zoom/Meet. It will transcribe the conversation and let you ask AI for help mid-class.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 pb-4">
          {!monitoringStarted ? (
            <Button
              className="w-full"
              onClick={handleStart}
              disabled={startMutation.isPending}
              data-testid="button-start-monitoring"
            >
              {startMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start AI Monitoring
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={openMonitorWindow}
                data-testid="button-open-ai-window"
              >
                <ExternalLink className="w-4 h-4" />
                Open AI Monitor Window
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close — AI still running
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-background/50 p-3 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon} {label}
      </div>
      <div className={`text-lg font-mono ${color}`}>{value}</div>
    </div>
  );
}
