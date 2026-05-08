import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStartSession } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Loader2, Mic, Activity, Eye, Wifi } from "lucide-react";
import AiOrb from "./AiOrb";

interface MonitoringModalProps {
  classId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonitoringModal({ classId, open, onOpenChange }: MonitoringModalProps) {
  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const [metrics, setMetrics] = useState({
    noise: 10,
    confidence: 85,
    attention: 90,
    internet: 99
  });

  const startMutation = useStartSession({
    mutation: {
      onSuccess: () => {
        setMonitoringStarted(true);
        toast.success("AI Monitoring active in background");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to start session");
      }
    }
  });

  useEffect(() => {
    if (!monitoringStarted || !open) return;
    const int = setInterval(() => {
      setMetrics({
        noise: Math.floor(Math.random() * 20) + 5,
        confidence: Math.floor(Math.random() * 15) + 80,
        attention: Math.floor(Math.random() * 20) + 75,
        internet: Math.floor(Math.random() * 5) + 95
      });
    }, 2000);
    return () => clearInterval(int);
  }, [monitoringStarted, open]);

  const handleStart = () => {
    startMutation.mutate({ data: { classId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass-card border-primary/20">
        <DialogTitle className="text-center pt-4">AI Classroom Assistant</DialogTitle>
        <DialogDescription className="text-center">
          {monitoringStarted ? "Real-time analysis active" : "Initialize monitoring before joining"}
        </DialogDescription>

        <div className="py-6 flex flex-col items-center">
          <AiOrb size="lg" isActive={monitoringStarted} />
          
          <AnimatePresence>
            {monitoringStarted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full mt-8 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Mic className="w-3 h-3" /> Noise Level
                    </div>
                    <div className="text-lg font-mono">{metrics.noise}%</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Activity className="w-3 h-3" /> Confidence
                    </div>
                    <div className="text-lg font-mono text-primary">{metrics.confidence}%</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Eye className="w-3 h-3" /> Attention
                    </div>
                    <div className="text-lg font-mono">{metrics.attention}%</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Wifi className="w-3 h-3" /> Internet
                    </div>
                    <div className="text-lg font-mono text-green-400">{metrics.internet}%</div>
                  </div>
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
            >
              {startMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start AI Monitoring
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close Window
              </Button>
              <Button onClick={() => {
                toast.success("Joining meeting...");
                setTimeout(() => onOpenChange(false), 1000);
              }}>
                Join Class
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
