import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassPulse } from "@/lib/classpulse";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

function riskColor(score: number) {
  if (score >= 75) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  return "text-yellow-400";
}

function riskLabel(score: number) {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

export default function ChurnAlertsPanel({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["churn-alerts"],
    queryFn: () => ClassPulse.listChurnAlerts(),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Churn Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Scanning your roster...</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No at-risk students. Keep it up!</p>
        )}
        <div className="space-y-3">
          {(data ?? []).slice(0, limit).map((alert, i) => (
            <motion.div
              key={alert.student.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{alert.student.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.prediction.reasons[0] ?? "Multiple signals"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TrendingDown className={`w-4 h-4 ${riskColor(alert.prediction.riskScore)}`} />
                <span className={`text-sm font-mono font-semibold ${riskColor(alert.prediction.riskScore)}`}>
                  {Math.round(alert.prediction.riskScore)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {riskLabel(alert.prediction.riskScore)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
