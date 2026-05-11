// Lightweight client for the ClassPulse AI extension endpoints.
//
// The generated React Query hooks in @workspace/api-client-react cover the
// existing Sheldon endpoints; ClassPulse-specific endpoints are accessed
// through this module until codegen is re-run.

import { isDemoMode, getDemoResponse } from "./demoData";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("sheldon_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Demo mode short-circuit — return fixture data without hitting the network.
  if (isDemoMode()) {
    const method = (init?.method ?? "GET").toUpperCase();
    let parsedBody: unknown = undefined;
    if (typeof init?.body === "string") {
      try { parsedBody = JSON.parse(init.body); } catch { parsedBody = init.body; }
    }
    const result = getDemoResponse(method, `/api${path}`, parsedBody);
    if (result !== null && result !== undefined) return result as T;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// ─── types ────────────────────────────────────────────────────────────────

export interface Student {
  id: number;
  name: string;
  email?: string | null;
  grade?: string | null;
  subject?: string | null;
  primaryTeacherId?: number | null;
  avatarUrl?: string | null;
}

export interface ChurnPrediction {
  id: number;
  studentId: number;
  riskScore: number;
  reasons: string[];
  signals: { name: string; value: number }[];
  computedAt: string;
}

export interface ChurnAlert {
  student: Student;
  prediction: ChurnPrediction;
}

export interface ParentReport {
  id: number;
  studentId: number;
  periodStart: string;
  periodEnd: string;
  engagementScore: number;
  understandingScore: number;
  confidenceScore: number;
  summary: string;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
  createdAt: string;
}

export interface TeacherKpi {
  teacher: {
    id: number;
    name: string;
    email: string;
    subject: string;
    avatarUrl?: string | null;
    totalClasses: number;
    avgScore: number;
  };
  avgEngagement: number;
  avgUnderstanding: number;
  churnRiskAvg: number;
  sessionsLast30d: number;
}

export interface StudentKpi {
  student: Student;
  avgEngagement: number;
  avgUnderstanding: number;
  churnRiskScore: number;
  lastSessionAt?: string | null;
}

export interface RetentionSnapshot {
  totalStudents: number;
  atRisk: number;
  churned30d: number;
  retainedRate: number;
  riskBuckets: { label: string; count: number }[];
}

export interface ConfusionSignal {
  confusion: number;
  signals: string[];
  rescueSuggestion: string;
}

export interface Intervention {
  id: number;
  sessionId: number | null;
  studentId: number | null;
  kind: "confusion" | "silent" | "low_engagement" | "churn_risk" | "rescue";
  suggestion: string;
  status: "suggested" | "applied" | "dismissed";
  createdAt: string;
}

export interface StudentDetail extends Student {
  recentReports: any[];
  churn: ChurnPrediction | null;
}

// ─── calls ────────────────────────────────────────────────────────────────

export const ClassPulse = {
  listStudents: () => request<Student[]>("/students"),
  getStudent: (id: number) => request<StudentDetail>(`/students/${id}`),
  getParentReport: (id: number) => request<ParentReport>(`/students/${id}/parent-report`),
  getChurn: (id: number) => request<ChurnPrediction>(`/students/${id}/churn`),
  listChurnAlerts: () => request<ChurnAlert[]>("/churn/alerts"),
  detectConfusion: (transcript: string) =>
    request<ConfusionSignal>("/ai/confusion", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),
  appendTranscript: (sessionId: number, speaker: "teacher" | "student" | "system", text: string) =>
    request<{ id: number }>(`/sessions/${sessionId}/transcript`, {
      method: "POST",
      body: JSON.stringify({ speaker, text }),
    }),
  recordQuiz: (
    sessionId: number,
    body: { studentId?: number | null; question: string; answer: string; correct: boolean; responseSeconds?: number | null }
  ) =>
    request(`/sessions/${sessionId}/quiz-event`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listInterventions: (sessionId: number) =>
    request<Intervention[]>(`/interventions/${sessionId}`),
  createIntervention: (body: { sessionId?: number | null; studentId?: number | null; kind: Intervention["kind"]; suggestion: string; status?: Intervention["status"] }) =>
    request<Intervention>("/interventions", { method: "POST", body: JSON.stringify(body) }),
  adminTeachers: () => request<TeacherKpi[]>("/admin/teachers"),
  adminStudents: () => request<StudentKpi[]>("/admin/students"),
  adminRetention: () => request<RetentionSnapshot>("/admin/retention"),
};
