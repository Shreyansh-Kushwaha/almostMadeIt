import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTeachersForSelect,
  useSelectTeacher,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Search, Loader2, User2, Sparkles } from "lucide-react";
import ClassPulseLogo from "@/components/ClassPulseLogo";
import { enableDemoMode, disableDemoMode } from "@/lib/demoData";

type TeacherOption = {
  id: number;
  name: string;
  subject: string;
  avatarUrl?: string | null;
  totalClasses: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // The picker itself runs against the live backend even if a stale demo flag
  // exists — make sure picking a real teacher exits demo mode cleanly.
  const ensureLiveMode = () => disableDemoMode();

  const { data: teachers = [], isLoading } = useListTeachersForSelect();
  const selectMutation = useSelectTeacher({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("sheldon_token", data.token);
        sessionStorage.setItem("sheldon_just_logged_in", "1");
        setLocation("/loading");
      },
      onError: () => {
        toast.error("Could not sign in as that teacher");
        setSelectedId(null);
      },
    },
  });

  const pickDemo = () => {
    enableDemoMode();
    sessionStorage.setItem("sheldon_just_logged_in", "1");
    setLocation("/loading");
  };

  const filtered = useMemo<TeacherOption[]>(() => {
    const q = query.trim().toLowerCase();
    const list = teachers as TeacherOption[];
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [teachers, query]);

  const pick = (id: number) => {
    if (selectMutation.isPending) return;
    ensureLiveMode();
    setSelectedId(id);
    selectMutation.mutate({ data: { teacherId: id } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <ClassPulseLogo size={72} animated className="drop-shadow-[0_8px_32px_rgba(255,122,0,0.35)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            ClassPulse AI
          </h1>
          <p className="text-muted-foreground mt-2">
            Select your teacher profile to continue
          </p>
        </div>

        <div className="relative mb-4 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-card/60 border-white/10 h-11"
            data-testid="input-teacher-search"
            autoFocus
          />
        </div>

        {/* Hackathon-safe Demo card — uses fully hardcoded fixtures, no backend dependency */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={pickDemo}
          data-testid="button-teacher-demo"
          className="group relative w-full max-w-md mx-auto mb-6 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 backdrop-blur-xl px-4 py-3 flex items-center gap-3 hover:border-primary/70 transition-colors shadow-[0_4px_24px_rgba(255,122,0,0.18)]"
        >
          <div className="w-11 h-11 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">Demo</p>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary font-bold">Hackathon</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Hardcoded data — works offline, no backend required
            </p>
          </div>
          <span className="text-xs text-primary font-medium shrink-0">
            Launch →
          </span>
        </motion.button>

        <div className="text-center mb-4">
          <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2">
            or pick a real teacher
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading teachers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <User2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No teachers match "{query}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filtered.map((t) => {
                const isSelected = selectedId === t.id;
                const isPending = isSelected && selectMutation.isPending;
                return (
                  <motion.button
                    key={t.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => pick(t.id)}
                    disabled={selectMutation.isPending}
                    data-testid={`button-teacher-${t.id}`}
                    className={`group relative text-left rounded-xl border bg-card/60 backdrop-blur-xl px-3 py-4 transition-colors disabled:opacity-50 ${
                      isSelected
                        ? "border-primary/60 ring-2 ring-primary/30"
                        : "border-white/10 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
                          {initials(t.name).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.subject}
                        </p>
                      </div>
                    </div>
                    {t.totalClasses > 0 && (
                      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.totalClasses} classes
                      </div>
                    )}
                    {isPending && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 rounded-xl bg-card/80 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          {filtered.length} of {teachers.length} teachers
        </p>
      </motion.div>
    </div>
  );
}
