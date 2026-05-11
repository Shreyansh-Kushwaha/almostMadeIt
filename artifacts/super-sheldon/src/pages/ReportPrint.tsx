// Clean print-ready view of a session AI report.
//
// This page is consumed by the backend's Playwright renderer at
// /reports/:reportId/print to produce the PDF that's emailed to the teacher
// (header.jpg + footer.jpg banner art, multicolor title underline, info bar,
// scores grid, AI summary, highlights, improvement areas, suggestions,
// mood timeline SVG). Mirrors ptm-agent's PrintEditor structure — the layout
// is the contract the renderer measures against (.page-wrap, max-width 21cm).

import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useGetReport } from "@workspace/api-client-react";
import { getGetReportQueryKey } from "@workspace/api-client-react";

function prettyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STAT_THEMES = {
  orange: { bg: "#FFF1E6", border: "#FFE0C7", text: "#FF7A00" },
  navy: { bg: "#EEF1FA", border: "#CCD3EF", text: "#1E2A5E" },
  mint: { bg: "#E8F5E9", border: "#B7E0BB", text: "#3FB984" },
  cyan: { bg: "#E0F7FB", border: "#A6E5EF", text: "#0891B2" },
  pink: { bg: "#FFE4E6", border: "#FFCDD2", text: "#E7556B" },
  purple: { bg: "#F1ECFE", border: "#D6C7FB", text: "#7C3AED" },
} as const;
type StatTheme = keyof typeof STAT_THEMES;

function StatCard({
  label,
  value,
  theme = "orange",
  suffix = "/100",
}: {
  label: string;
  value: number | null | undefined;
  theme?: StatTheme;
  suffix?: string;
}) {
  if (value == null) return null;
  const t = STAT_THEMES[theme];
  return (
    <div
      style={{
        padding: "16px 12px",
        borderRadius: 6,
        background: t.bg,
        border: `1px solid ${t.border}`,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: t.text,
          fontFamily: "'Plus Jakarta Sans', system-ui",
          letterSpacing: "-0.02em",
          marginBottom: 4,
          lineHeight: 1.0,
        }}
      >
        {Math.round(value)}
        <span style={{ fontSize: 14, opacity: 0.7 }}>{suffix}</span>
      </p>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#1E2A5E",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, breakInside: "avoid" }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#1E2A5E",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          paddingBottom: 8,
          marginBottom: 12,
          borderBottom: "1px solid #E5E8EE",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FF7A00",
            display: "inline-block",
          }}
        />
        {title}
      </h2>
      {children}
    </div>
  );
}

function MoodTimelineSvg({ data }: { data: Array<{ minute: number; mood?: number; energy?: number; valence?: number }> }) {
  if (!data || data.length === 0) return null;
  const w = 600;
  const h = 120;
  const xs = data.map((d) => d.minute);
  const ys = data.map((d) => (d.mood ?? d.energy ?? d.valence ?? 50) as number);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) || minX + 1;
  const minY = 0;
  const maxY = 100;
  const sx = (v: number) => ((v - minX) / (maxX - minX || 1)) * w;
  const sy = (v: number) => h - ((v - minY) / (maxY - minY)) * h;
  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.minute).toFixed(1)},${sy(ys[i]).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${sx(maxX).toFixed(1)},${h} L${sx(minX).toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 120 }}>
      <defs>
        <linearGradient id="mood-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FF7A00" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mood-fill)" />
      <path d={path} fill="none" stroke="#FF7A00" strokeWidth="2.5" />
    </svg>
  );
}

export default function ReportPrint() {
  const { reportId } = useParams();
  const id = Number(reportId);
  const { data: report, isLoading, isError } = useGetReport(id, {
    query: { enabled: !!reportId, queryKey: getGetReportQueryKey(id) },
  });

  // The print page must NOT pick up the app's dark mode — strip it on mount.
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    document.body.style.background = "#F5F6F8";
    return () => {
      if (hadDark) html.classList.add("dark");
      document.body.style.background = "";
    };
  }, []);

  // Bridge state used by the Playwright renderer: it waits for `load` THEN
  // 300ms, so we expose readiness via `data-ready` on the page-wrap.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (report) setReady(true);
  }, [report]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif", color: "#1E2A5E" }}>
        Loading report…
      </div>
    );
  }
  if (isError || !report) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif", color: "#E7556B" }}>
        Report not found.
      </div>
    );
  }

  const studentName = report.class?.studentName ?? "Student";
  const subject = report.class?.subject ?? "Class";
  const teacherName = "ClassPulse AI";
  const r = report as unknown as Record<string, unknown>;
  const moodTimeline = (r.moodTimeline as Array<{ minute: number; mood?: number; energy?: number; valence?: number }>) ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F6F8; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: #2A2E36; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .page-wrap { max-width: 21cm; margin: 24px auto; background: white; box-shadow: 0 2px 16px rgba(15, 17, 21, 0.08); }
        .report-container { max-width: 680px; margin: 0 auto; padding: 32px 40px; background: white; }
        .banner-img { display: block; width: 100%; height: auto; }
        .display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      <div className="page-wrap" data-ready={ready ? "true" : "false"}>
        <img src="/report-header.jpg" alt="" className="banner-img" />

        <div className="report-container">
          {/* Title with multicolor underline (matches ptm-agent) */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              className="display"
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#1E2A5E",
                letterSpacing: "-0.01em",
                marginBottom: 10,
              }}
            >
              Session AI Report
            </h1>
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {["#FF7A00", "#FFC93C", "#3FB984", "#22D3EE", "#7C3AED"].map((c, i) => (
                <span key={i} style={{ width: 36, height: 4, background: c, borderRadius: 2 }} />
              ))}
            </div>
          </div>

          {/* Student info bar */}
          <div
            style={{
              background: "#FFF1E6",
              borderLeft: "4px solid #FF7A00",
              padding: "14px 18px",
              marginBottom: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 24px",
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: "#1E2A5E" }}>Student:</span> {studentName}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#1E2A5E" }}>Subject:</span> {subject}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#1E2A5E" }}>Teacher:</span> {teacherName}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#1E2A5E" }}>Session Date:</span>{" "}
              {prettyDate(report.createdAt)}
            </div>
          </div>

          {/* Overall score callout */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 8,
              background: "linear-gradient(90deg, #FF7A00, #FFB066)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  opacity: 0.85,
                }}
              >
                Overall Session Score
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Composite of engagement, understanding and satisfaction
              </div>
            </div>
            <div
              className="display"
              style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              {report.overallScore}
              <span style={{ fontSize: 18, opacity: 0.85 }}>/100</span>
            </div>
          </div>

          {/* Primary scores */}
          <PrintSection title="Session Scores">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <StatCard label="Engagement" value={report.engagementScore} theme="orange" />
              <StatCard label="Voice Clarity" value={report.voiceClarityScore} theme="cyan" />
              <StatCard label="Interaction" value={report.interactionScore} theme="navy" />
              <StatCard label="Confidence" value={report.speakingConfidence} theme="mint" />
            </div>
          </PrintSection>

          {/* AI scores (when present) */}
          {((r.understandingScore as number | null) != null ||
            (r.satisfactionScore as number | null) != null ||
            (r.teacherCompatibilityScore as number | null) != null ||
            (r.churnRiskScore as number | null) != null) && (
            <PrintSection title="ClassPulse AI Signals">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <StatCard label="Understanding" value={r.understandingScore as number | null} theme="navy" />
                <StatCard label="Satisfaction" value={r.satisfactionScore as number | null} theme="mint" />
                <StatCard label="Compatibility" value={r.teacherCompatibilityScore as number | null} theme="purple" />
                <StatCard label="Churn Risk" value={r.churnRiskScore as number | null} theme="pink" />
              </div>
            </PrintSection>
          )}

          {/* AI Summary */}
          {report.aiSummary && (
            <PrintSection title="AI Summary">
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "#2A2E36" }}>{report.aiSummary}</p>
            </PrintSection>
          )}

          {/* Highlights */}
          {report.highlights && report.highlights.length > 0 && (
            <PrintSection title="Highlights">
              <ul
                style={{
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {report.highlights.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      background: "#F1F8E9",
                      border: "1px solid #C8E6C9",
                      borderRadius: 6,
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "#1E2A5E",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      breakInside: "avoid",
                    }}
                  >
                    <span style={{ color: "#3FB984", fontSize: 14, lineHeight: 1.2 }}>★</span>
                    {item}
                  </li>
                ))}
              </ul>
            </PrintSection>
          )}

          {/* Improvement Areas */}
          {report.improvementAreas && report.improvementAreas.length > 0 && (
            <PrintSection title="Areas to Improve">
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {report.improvementAreas.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#2A2E36",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        background: "#E7556B",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </PrintSection>
          )}

          {/* Suggestions */}
          {report.suggestions && report.suggestions.length > 0 && (
            <PrintSection title="Suggestions for Next Session">
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {report.suggestions.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#2A2E36",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "#FF7A00", fontWeight: 700, lineHeight: 1.4, flexShrink: 0 }}>
                      →
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </PrintSection>
          )}

          {/* Mood Timeline */}
          {moodTimeline.length > 0 && (
            <PrintSection title="Mood Timeline">
              <MoodTimelineSvg data={moodTimeline} />
            </PrintSection>
          )}
        </div>

        <img src="/report-footer.jpg" alt="" className="banner-img" />
      </div>
    </>
  );
}
