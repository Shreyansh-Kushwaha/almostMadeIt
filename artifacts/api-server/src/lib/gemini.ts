// DEPRECATED — Gemini integration has been replaced by Azure OpenAI (GPT-5.1).
// This shim is retained only so any stale imports keep compiling. New code
// must import from "./azure-openai" directly.

import { generateClassReport, type ClassReportInput } from "./azure-openai";

export async function generateAiReport(studentName: string, subject: string, teacherName: string) {
  const input: ClassReportInput = { studentName, subject, teacherName };
  return generateClassReport(input);
}
