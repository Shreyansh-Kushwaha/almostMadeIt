import { useState } from "react";
import { useListClasses } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Calendar, Clock, Video, Users } from "lucide-react";
import MonitoringModal from "@/components/MonitoringModal";

export default function Classes() {
  const { data: classes, isLoading } = useListClasses();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  const upcoming = classes?.filter(c => c.status === "upcoming") || [];
  const completed = classes?.filter(c => c.status === "completed") || [];

  const ClassCard = ({ c }: { c: any }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card hover:border-primary/30 transition-colors">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{c.studentName}</h3>
              <p className="text-sm text-muted-foreground">{c.subject}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.scheduledAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(c.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-sm capitalize"><Video className="w-3 h-3" /> {c.platform.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <div>
            {c.status === "upcoming" ? (
              <Button onClick={() => setSelectedClassId(c.id)}>
                Get Started
              </Button>
            ) : (
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">Completed</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="text-muted-foreground mt-1">Manage your schedule and initialize AI monitoring.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming</h2>
        {upcoming.length === 0 && <p className="text-muted-foreground">No upcoming classes.</p>}
        {upcoming.map(c => <ClassCard key={c.id} c={c} />)}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Completed</h2>
        <div className="opacity-70">
          {completed.map(c => <ClassCard key={c.id} c={c} />)}
        </div>
      </div>

      <MonitoringModal 
        classId={selectedClassId!} 
        open={selectedClassId !== null} 
        onOpenChange={(o) => !o && setSelectedClassId(null)} 
      />
    </div>
  );
}
