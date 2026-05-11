import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  setBackendStatusListener,
  type BackendStatus,
} from "@workspace/api-client-react";
import { Loader2, Info, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Mode = "idle" | "waking" | "recovering";

/**
 * Sticky bottom-left chip that surfaces cold-start latency to the user when the
 * backend (Render free tier, etc.) is asleep. Subscribes to network events
 * emitted by the api-client-react custom fetch wrapper.
 */
export default function BackendStatusToast() {
  const [mode, setMode] = useState<Mode>("idle");
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Subscribe to backend status events from custom-fetch
  useEffect(() => {
    setBackendStatusListener((status: BackendStatus) => {
      if (status === "waking") {
        setMode((current) => (current === "idle" ? "waking" : current));
        setWaitingSince((prev) => prev ?? Date.now());
      } else if (status === "online") {
        setMode((current) => {
          if (current === "waking") {
            // Briefly show "back online" before disappearing
            setTimeout(() => setMode("idle"), 2500);
            return "recovering";
          }
          return current === "recovering" ? current : "idle";
        });
        setWaitingSince(null);
      }
    });
    return () => setBackendStatusListener(null);
  }, []);

  // Tick the elapsed counter while we're waking up
  useEffect(() => {
    if (mode !== "waking" || waitingSince == null) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - waitingSince) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [mode, waitingSince]);

  if (mode === "idle") return null;

  const isRecovering = mode === "recovering";

  return (
    <TooltipProvider delayDuration={150}>
      <AnimatePresence>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 left-6 z-50 pointer-events-auto"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`group flex items-center gap-2.5 rounded-full border px-3 py-2 shadow-2xl backdrop-blur-xl cursor-help select-none transition-colors ${
                  isRecovering
                    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                    : "bg-card/80 border-primary/30 text-foreground"
                }`}
                data-testid="backend-status-chip"
              >
                {isRecovering ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold">
                    {isRecovering ? "Backend online" : "Waking the backend…"}
                  </span>
                  {!isRecovering && (
                    <span className="text-[10px] text-muted-foreground">
                      {elapsed > 0 ? `${elapsed}s elapsed` : "first request in a while"}
                    </span>
                  )}
                </div>
                {!isRecovering && (
                  <Info className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs leading-relaxed">
                The backend is hosted on Render's free tier, which puts servers
                to sleep after inactivity. The first request after idle takes{" "}
                <strong className="text-foreground">30–60 seconds</strong> to
                spin up. We'll keep retrying — once it's awake everything is
                fast again.
              </p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
}
