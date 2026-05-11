import { Radar } from "lucide-react";
import { motion } from "framer-motion";

export interface ConfusionRadarProps {
  confusion: number; // 0-100
  signals: string[];
  rescueSuggestion?: string | null;
  compact?: boolean;
}

function tone(c: number) {
  if (c >= 70) return { ring: "ring-red-500/60", glow: "shadow-[0_0_22px_#ef4444]", text: "text-red-400" };
  if (c >= 40) return { ring: "ring-orange-500/60", glow: "shadow-[0_0_18px_#fb923c]", text: "text-orange-400" };
  return { ring: "ring-emerald-500/40", glow: "shadow-[0_0_14px_#34d399]", text: "text-emerald-400" };
}

export default function ConfusionRadar({ confusion, signals, rescueSuggestion, compact }: ConfusionRadarProps) {
  const t = tone(confusion);
  return (
    <div className={`rounded-lg border border-white/10 bg-white/5 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: confusion >= 70 ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: confusion >= 70 ? Infinity : 0, duration: 1.4 }}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center bg-black/40 ring-2 ${t.ring} ${t.glow}`}
        >
          <Radar className={`w-5 h-5 ${t.text}`} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-xs uppercase tracking-wider text-white/40">Confusion Radar</p>
            <span className={`text-xs font-mono font-bold ${t.text}`}>{Math.round(confusion)}</span>
          </div>
          {signals.length > 0 && (
            <p className="text-xs text-white/60 truncate">
              {signals.slice(0, 2).join(" • ")}
            </p>
          )}
        </div>
      </div>
      {rescueSuggestion && !compact && (
        <p className="mt-2 text-xs text-white/70 leading-relaxed border-l-2 border-[#ff7a00]/50 pl-2">
          <span className="text-[#ff7a00] font-semibold">Class Rescue:</span> {rescueSuggestion}
        </p>
      )}
    </div>
  );
}
