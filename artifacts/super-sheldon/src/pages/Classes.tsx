import { useEffect, useState } from "react";
import { useListClasses, type Class } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import MonitoringModal from "@/components/MonitoringModal";

interface SelectedClass {
  id: number;
  studentName: string;
  subject: string;
}

const PAGE_SIZE = 12;

type StatusFilter = "all" | "upcoming" | "completed" | "cancelled";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function Classes() {
  const [status, setStatus] = useState<StatusFilter>("upcoming");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedClass | null>(null);

  // Debounce search input → committed search query
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const { data, isLoading, isFetching } = useListClasses({
    page,
    limit: PAGE_SIZE,
    ...(status !== "all" ? { status } : {}),
    ...(search ? { q: search } : {}),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ClassCard = ({ c }: { c: Class }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      data-testid={`card-class-${c.id}`}
    >
      <Card className="glass-card hover:border-primary/30 transition-colors">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{c.studentName}</h3>
              <p className="text-sm text-muted-foreground">{c.subject}</p>
              <div className="flex items-center flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(c.scheduledAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(c.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-sm capitalize">
                  <Video className="w-3 h-3" />
                  {c.platform.replace("_", " ")}
                </span>
                <span className="text-muted-foreground/60">{c.durationMinutes} min</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {c.status === "upcoming" ? (
              <Button
                onClick={() => setSelected({ id: c.id, studentName: c.studentName, subject: c.subject })}
                data-testid={`button-get-started-${c.id}`}
              >
                Get Started
              </Button>
            ) : (
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm capitalize">
                {c.status}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="text-muted-foreground mt-1">
          Manage your schedule and launch the AI monitoring assistant.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const active = tab.key === status;
            return (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                data-testid={`tab-status-${tab.key}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-card/60 text-muted-foreground border border-white/5 hover:text-foreground hover:border-white/10"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-card/60 border-white/10 h-9"
            data-testid="input-search-classes"
          />
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isLoading
            ? "Loading…"
            : total === 0
              ? "No classes match these filters"
              : `${total} total · showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`}
        </span>
        {isFetching && !isLoading && (
          <span className="text-primary/80 animate-pulse">Refreshing…</span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card/30 rounded-xl border border-white/5">
          <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No matching classes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((c) => (
              <ClassCard key={c.id} c={c} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
            data-testid="button-page-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || isFetching}
            data-testid="button-page-next"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <MonitoringModal
        classId={selected?.id ?? 0}
        studentName={selected?.studentName}
        subject={selected?.subject}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
