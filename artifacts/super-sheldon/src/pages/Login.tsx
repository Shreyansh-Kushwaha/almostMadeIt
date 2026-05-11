import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTeachersForSelect,
  useSelectTeacher,
  useListStudentsForSelect,
  useSelectStudent,
  useAdminLogin,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search, Loader2, User2, Sparkles, ChevronLeft, ShieldCheck,
  GraduationCap, Users, AlertTriangle,
} from "lucide-react";
import ClassPulseLogo from "@/components/ClassPulseLogo";
import { enableDemoMode, disableDemoMode } from "@/lib/demoData";

type TeacherOption = { id: string; name: string; subject: string; avatarUrl?: string | null; totalClasses: number };
type StudentOption = { id: string; name: string; subject?: string | null; grade?: string | null; avatarUrl?: string | null };

type Step = "role" | "teacher" | "student";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("role");

  const goLoading = () => {
    sessionStorage.setItem("sheldon_just_logged_in", "1");
    setLocation("/loading");
  };

  const ensureLive = () => disableDemoMode();

  // Preview-mode: clicking Admin authenticates immediately — no password.
  const adminLogin = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("sheldon_token", data.token);
        toast.success("Welcome, Admin");
        goLoading();
      },
      onError: () => toast.error("Couldn't sign in as admin"),
    },
  });
  const signInAsAdmin = () => {
    ensureLive();
    adminLogin.mutate({ data: {} });
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
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <ClassPulseLogo size={64} animated className="drop-shadow-[0_8px_32px_rgba(255,122,0,0.35)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">ClassPulse AI</h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="text-muted-foreground mt-2"
            >
              {step === "role" && "Who's signing in today?"}
              {step === "teacher" && "Pick your teacher profile"}
              {step === "student" && "Pick your name to continue"}
            </motion.p>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {step === "role" && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <DemoCard onClick={() => { enableDemoMode(); goLoading(); }} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <RoleCard
                  icon={<GraduationCap className="w-6 h-6" />}
                  title="Teacher"
                  subtitle="Pick from teacher roster — no password"
                  onClick={() => { ensureLive(); setStep("teacher"); }}
                  testId="role-teacher"
                />
                <RoleCard
                  icon={<Users className="w-6 h-6" />}
                  title="Student / Parent"
                  subtitle="Pick a student to see their reports"
                  onClick={() => { ensureLive(); setStep("student"); }}
                  testId="role-student"
                />
                <RoleCard
                  icon={<ShieldCheck className="w-6 h-6" />}
                  title="Admin"
                  subtitle="Preview access — no password"
                  onClick={signInAsAdmin}
                  testId="role-admin"
                  accent="primary"
                  loading={adminLogin.isPending}
                />
              </div>
            </motion.div>
          )}

          {step === "teacher" && (
            <TeacherStep key="teacher" onBack={() => setStep("role")} onSuccess={goLoading} />
          )}

          {step === "student" && (
            <StudentStep key="student" onBack={() => setStep("role")} onSuccess={goLoading} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Role cards ───────────────────────────────────────────────────────────────

function DemoCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      data-testid="button-teacher-demo"
      className="group relative w-full max-w-md mx-auto rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 backdrop-blur-xl px-4 py-3 flex items-center gap-3 hover:border-primary/70 transition-colors shadow-[0_4px_24px_rgba(255,122,0,0.18)]"
    >
      <div className="w-11 h-11 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">Demo</p>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary font-bold">Hackathon</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">Hardcoded data — works offline, no backend required</p>
      </div>
      <span className="text-xs text-primary font-medium shrink-0">Launch →</span>
    </motion.button>
  );
}

function RoleCard({ icon, title, subtitle, onClick, testId, accent, loading }: {
  icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; testId: string; accent?: "primary"; loading?: boolean;
}) {
  return (
    <motion.button
      whileHover={loading ? undefined : { y: -3 }}
      whileTap={loading ? undefined : { scale: 0.98 }}
      onClick={loading ? undefined : onClick}
      disabled={loading}
      data-testid={`button-${testId}`}
      className={`group relative text-left rounded-xl border bg-card/60 backdrop-blur-xl p-5 transition-colors disabled:opacity-60 ${
        accent === "primary"
          ? "border-primary/40 hover:border-primary/70"
          : "border-white/10 hover:border-primary/40"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
        accent === "primary" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
      }`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      <span className="absolute top-4 right-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
    </motion.button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="button-step-back"
      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
    >
      <ChevronLeft className="w-3 h-3" /> Back to role
    </button>
  );
}

// ─── Teacher step ─────────────────────────────────────────────────────────────

function TeacherStep({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: teachers = [], isLoading, isError, refetch } = useListTeachersForSelect();
  const mutation = useSelectTeacher({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("sheldon_token", data.token);
        onSuccess();
      },
      onError: () => { toast.error("Could not sign in as that teacher"); setSelectedId(null); },
    },
  });

  const filtered = useMemo<TeacherOption[]>(() => {
    const q = query.trim().toLowerCase();
    const list = teachers as TeacherOption[];
    if (!q) return list;
    return list.filter((t) =>
      t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q),
    );
  }, [teachers, query]);

  const pick = (id: string) => {
    if (mutation.isPending) return;
    setSelectedId(id);
    mutation.mutate({ data: { teacherId: id } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <BackButton onClick={onBack} />
      <div className="relative mb-6 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-card/60 border-white/10 h-11"
          autoFocus
          data-testid="input-teacher-search"
        />
      </div>

      {isLoading ? (
        <PickerLoading label="Loading teachers…" />
      ) : isError ? (
        <PickerError label="Couldn't load teachers" onRetry={() => refetch()} />
      ) : teachers.length === 0 ? (
        <PickerEmpty label="No teachers available yet" />
      ) : filtered.length === 0 ? (
        <PickerEmpty label={`No matches for "${query}"`} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filtered.map((t) => (
              <PickerCard
                key={t.id}
                title={t.name}
                subtitle={t.subject}
                avatarUrl={t.avatarUrl}
                hint={t.totalClasses > 0 ? `${t.totalClasses} classes` : undefined}
                selected={selectedId === t.id}
                pending={selectedId === t.id && mutation.isPending}
                disabled={mutation.isPending}
                onClick={() => pick(t.id)}
                testId={`teacher-${t.id}`}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        {filtered.length} of {teachers.length} teachers
      </p>
    </motion.div>
  );
}

// ─── Student step ─────────────────────────────────────────────────────────────

function StudentStep({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: students = [], isLoading, isError, refetch } = useListStudentsForSelect();
  const mutation = useSelectStudent({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("sheldon_token", data.token);
        onSuccess();
      },
      onError: () => { toast.error("Could not sign in as that student"); setSelectedId(null); },
    },
  });

  const filtered = useMemo<StudentOption[]>(() => {
    const q = query.trim().toLowerCase();
    const list = students as StudentOption[];
    if (!q) return list;
    return list.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.subject ?? "").toLowerCase().includes(q) ||
      (s.grade ?? "").toLowerCase().includes(q),
    );
  }, [students, query]);

  const pick = (id: string) => {
    if (mutation.isPending) return;
    setSelectedId(id);
    mutation.mutate({ data: { studentId: id } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <BackButton onClick={onBack} />
      <div className="relative mb-6 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search your name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-card/60 border-white/10 h-11"
          autoFocus
          data-testid="input-student-search"
        />
      </div>

      {isLoading ? (
        <PickerLoading label="Loading students…" />
      ) : isError ? (
        <PickerError label="Couldn't load students" onRetry={() => refetch()} />
      ) : students.length === 0 ? (
        <PickerEmpty label="No students available yet" />
      ) : filtered.length === 0 ? (
        <PickerEmpty label={`No matches for "${query}"`} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filtered.map((s) => (
              <PickerCard
                key={s.id}
                title={s.name}
                subtitle={s.subject ?? "—"}
                avatarUrl={s.avatarUrl}
                hint={s.grade ? `Grade ${s.grade}` : undefined}
                selected={selectedId === s.id}
                pending={selectedId === s.id && mutation.isPending}
                disabled={mutation.isPending}
                onClick={() => pick(s.id)}
                testId={`student-${s.id}`}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        {filtered.length} of {students.length} students
      </p>
    </motion.div>
  );
}

// ─── Picker primitives ────────────────────────────────────────────────────────

function PickerCard({ title, subtitle, avatarUrl, hint, selected, pending, disabled, onClick, testId }: {
  title: string; subtitle: string; avatarUrl?: string | null; hint?: string;
  selected: boolean; pending: boolean; disabled: boolean; onClick: () => void; testId: string;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${testId}`}
      className={`group relative text-left rounded-xl border bg-card/60 backdrop-blur-xl px-3 py-4 transition-colors disabled:opacity-50 ${
        selected ? "border-primary/60 ring-2 ring-primary/30" : "border-white/10 hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={title} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
            {initials(title).toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      {hint && (
        <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</div>
      )}
      {pending && (
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
}

function PickerLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function PickerEmpty({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <User2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>{label}</p>
    </div>
  );
}

function PickerError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-xs mt-1">The backend isn't reachable. Check your connection or contact support.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} data-testid="button-picker-retry">
        Try again
      </Button>
    </div>
  );
}
