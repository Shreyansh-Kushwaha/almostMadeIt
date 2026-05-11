import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ClassPulse } from "@/lib/classpulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { GraduationCap, ChevronRight, Search, Inbox } from "lucide-react";

interface StudentWithMeta {
  id: number;
  name: string;
  email?: string | null;
  grade?: string | null;
  subject?: string | null;
  primaryTeacherId?: number | null;
  avatarUrl?: string | null;
  classCount?: number;
}

export default function Students() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => ClassPulse.listStudents() as Promise<StudentWithMeta[]>,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.subject ?? "").toLowerCase().includes(q) ||
        (s.grade ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${data?.length ?? 0} learners under your watch`}
            {!isLoading && search && data && data.length !== filtered.length && (
              <span> · {filtered.length} match "{search}"</span>
            )}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, subject or grade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60 border-white/10 h-9"
            data-testid="input-students-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {search ? `No students match "${search}"` : "You don't have any students linked yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <Card className="glass-card cursor-pointer hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    {s.name}
                  </CardTitle>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {s.subject ?? "—"} · Grade {s.grade ?? "?"}
                  </p>
                  {typeof s.classCount === "number" && s.classCount > 0 && (
                    <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium">
                      {s.classCount} {s.classCount === 1 ? "class" : "classes"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
