// Admin-only audit page for email delivery.
// Reads from /api/admin/delivery-logs and surfaces every send attempt
// (sent / failed / skipped) so the team can debug n8n issues without
// digging through server logs.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAdminDeliveryLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, MinusCircle, Mail, ExternalLink, Search } from "lucide-react";

type StatusKind = "sent" | "failed" | "skipped" | string;

function StatusBadge({ status }: { status: StatusKind }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
      <MinusCircle className="w-3 h-3" /> Skipped
    </span>
  );
}

function prettyTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminLogs() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed" | "skipped">("");
  const { data: logs = [], isLoading } = useAdminDeliveryLogs();

  const filtered = useMemo(() => {
    let list = logs;
    if (statusFilter) list = list.filter((l) => l.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          (l.studentName ?? "").toLowerCase().includes(q) ||
          (l.subject ?? "").toLowerCase().includes(q) ||
          (l.recipient ?? "").toLowerCase().includes(q) ||
          (l.errorMessage ?? "").toLowerCase().includes(q) ||
          String(l.reportId).includes(q),
      );
    }
    return list;
  }, [logs, query, statusFilter]);

  const counts = useMemo(() => {
    const c = { sent: 0, failed: 0, skipped: 0 };
    for (const l of logs) {
      if (l.status === "sent") c.sent += 1;
      else if (l.status === "failed") c.failed += 1;
      else if (l.status === "skipped") c.skipped += 1;
    }
    return c;
  }, [logs]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            Email Delivery Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Every send attempt is recorded here — sent, failed, or skipped.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setStatusFilter(statusFilter === "sent" ? "" : "sent")}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              statusFilter === "sent"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-card border-white/10 hover:border-emerald-500/30"
            }`}
            data-testid="filter-sent"
          >
            Sent · <span className="font-bold tabular-nums">{counts.sent}</span>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "failed" ? "" : "failed")}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              statusFilter === "failed"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-card border-white/10 hover:border-rose-500/30"
            }`}
            data-testid="filter-failed"
          >
            Failed · <span className="font-bold tabular-nums">{counts.failed}</span>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "skipped" ? "" : "skipped")}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              statusFilter === "skipped"
                ? "bg-zinc-500/15 border-zinc-500/40 text-zinc-300"
                : "bg-card border-white/10 hover:border-zinc-500/30"
            }`}
            data-testid="filter-skipped"
          >
            Skipped · <span className="font-bold tabular-nums">{counts.skipped}</span>
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filter by student, recipient, error, or report id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-10"
          data-testid="input-logs-search"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {logs.length === 0
              ? "No emails have been sent yet."
              : "No matches for the current filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.id} className="glass-card">
              <CardContent className="p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <StatusBadge status={l.status} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link href={`/reports/${l.reportId}`} className="text-primary hover:underline">
                      #{l.reportId}
                    </Link>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">
                      {l.studentName ?? "Unknown"}
                      {l.subject ? ` — ${l.subject}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span>
                      To: <span className="text-foreground">{l.recipient ?? "—"}</span>
                    </span>
                    {l.intendedRecipient && l.intendedRecipient !== l.recipient && (
                      <span className="text-amber-400">override · on-record was {l.intendedRecipient}</span>
                    )}
                    <span>{prettyTime(l.sentAt)}</span>
                    {l.triggeredBy && <span className="opacity-70">by {l.triggeredBy}</span>}
                  </div>
                  {l.errorMessage && (
                    <div className="text-xs text-rose-400 mt-1 font-mono truncate">
                      {l.errorMessage}
                    </div>
                  )}
                </div>
                {l.pdfUrl && (
                  <a
                    href={l.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10"
                    data-testid={`pdf-link-${l.id}`}
                  >
                    PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
