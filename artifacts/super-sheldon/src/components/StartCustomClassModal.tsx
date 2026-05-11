import { useState } from "react";
import { useStartCustomSession, useGetActiveSession, getGetActiveSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Video } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface StartCustomClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [30, 45, 60, 90];
const PLATFORMS: { value: "zoom" | "google_meet" | "teams"; label: string }[] = [
  { value: "zoom", label: "Zoom" },
  { value: "google_meet", label: "Google Meet" },
  { value: "teams", label: "Teams" },
];

export default function StartCustomClassModal({ open, onOpenChange }: StartCustomClassModalProps) {
  const qc = useQueryClient();
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [platform, setPlatform] = useState<"zoom" | "google_meet" | "teams">("zoom");

  // Refetch active-session after creating one so the banner appears.
  useGetActiveSession({ query: { queryKey: getGetActiveSessionQueryKey() } });

  const mutation = useStartCustomSession({
    mutation: {
      onSuccess: (data) => {
        toast.success(`Started monitoring "${data.class!.studentName}"`);
        qc.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        // Open the Monitor popup with the new session details
        const token = localStorage.getItem("sheldon_token") ?? "";
        const params = new URLSearchParams({
          sessionId: String(data.session!.id),
          token,
          studentName: data.class!.studentName,
          subject: data.class!.subject,
        });
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        window.open(
          `${base}/monitor?${params.toString()}`,
          "sheldon_ai_monitor",
          "width=400,height=680,top=80,left=20,resizable=yes,scrollbars=no",
        );
        // Reset + close
        setStudentName("");
        setSubject("");
        setGrade("");
        setDurationMinutes(60);
        setPlatform("zoom");
        onOpenChange(false);
      },
      onError: () => {
        toast.error("Could not start custom class");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = studentName.trim();
    const subj = subject.trim();
    if (!name || !subj) {
      toast.error("Student name and subject are required");
      return;
    }
    mutation.mutate({
      data: {
        studentName: name,
        subject: subj,
        durationMinutes,
        platform,
        ...(grade.trim() ? { grade: grade.trim() } : {}),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <DialogTitle>Start Custom Class</DialogTitle>
          </div>
          <DialogDescription>
            Spin up an ad-hoc class instantly — no scheduling needed. It's saved
            to your classes so the report shows up afterwards.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cc-student">Student name</Label>
            <Input
              id="cc-student"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Aria Patel"
              autoFocus
              required
              data-testid="input-custom-student"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-subject">Subject</Label>
              <Input
                id="cc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Algebra II"
                required
                data-testid="input-custom-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-grade">Grade (optional)</Label>
              <Input
                id="cc-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. 8"
                data-testid="input-custom-grade"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <motion.button
                  type="button"
                  key={d}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDurationMinutes(d)}
                  data-testid={`button-duration-${d}`}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    durationMinutes === d
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-card/60 text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {d}m
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Video className="w-3 h-3" /> Platform</Label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <motion.button
                  type="button"
                  key={p.value}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPlatform(p.value)}
                  data-testid={`button-platform-${p.value}`}
                  className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${
                    platform === p.value
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-card/60 text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {p.label}
                </motion.button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !studentName.trim() || !subject.trim()}
              data-testid="button-start-custom-submit"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Start &amp; Monitor</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
