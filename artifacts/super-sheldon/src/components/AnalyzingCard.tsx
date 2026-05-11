import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import AiOrb from "./AiOrb";

interface AnalyzingCardProps {
  /** Phase labels rendered as a vertical checklist. */
  phases: string[];
  /** Title shown above the phase list. */
  title?: string;
  /** Subtitle shown under the title. */
  subtitle?: string;
  /** When provided, phases beyond this index render as pending; phases at or before render as active/done as time passes. */
  doneCount?: number;
}

/**
 * Polished loading card with cycling phase labels. Use while data is being
 * fetched from slow endpoints so the user sees motion instead of a frozen
 * skeleton. Phases visually advance every ~600ms; if `doneCount` is provided,
 * checkmarks reflect actually completed work.
 */
export default function AnalyzingCard({
  phases,
  title = "Working on it",
  subtitle = "This usually takes a few seconds…",
  doneCount,
}: AnalyzingCardProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((idx) => (idx + 1 < phases.length ? idx + 1 : idx));
    }, 600);
    return () => clearInterval(interval);
  }, [phases.length]);

  return (
    <div className="w-full flex items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 shadow-xl"
      >
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 mb-3">
            <AiOrb size="sm" isActive />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {phases.map((label, idx) => {
              const isDone = doneCount != null ? idx < doneCount : idx < activeIdx;
              const isActive = doneCount != null ? idx === doneCount : idx === activeIdx;
              return (
                <motion.li
                  key={label}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    isDone
                      ? "border-primary/30 bg-primary/5"
                      : isActive
                        ? "border-white/10 bg-card/50"
                        : "border-white/5 bg-card/30 opacity-60"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-primary/20 text-primary"
                        : isActive
                          ? "bg-white/5 text-primary"
                          : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      >
                        <Check className="w-4 h-4" />
                      </motion.span>
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-current opacity-40" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isDone ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </motion.div>
    </div>
  );
}
