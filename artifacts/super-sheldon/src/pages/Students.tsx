import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ClassPulse } from "@/lib/classpulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, ChevronRight } from "lucide-react";

export default function Students() {
  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => ClassPulse.listStudents(),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} learners under your watch</p>
      </div>

      {(data ?? []).length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You don't have any students linked yet. Run the demo seed to populate ClassPulse data.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data ?? []).map((s) => (
          <Link key={s.id} href={`/students/${s.id}`}>
            <Card className="glass-card cursor-pointer hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  {s.name}
                </CardTitle>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.subject ?? "—"} · Grade {s.grade ?? "?"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
