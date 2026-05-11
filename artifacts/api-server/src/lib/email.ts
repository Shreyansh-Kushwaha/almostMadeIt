// Hands AI-report email delivery off to an n8n webhook.
//
// Why a webhook and not direct SMTP: Render (and most PaaS hosts) block
// outbound SMTP on port 587, so nodemailer/aiosmtplib calls hang. n8n is
// hosted where Gmail/SES egress works, so we let it do the actual send and
// report success/failure via HTTP status.
//
// Required env:
//   N8N_EMAIL_WEBHOOK_URL  — full URL of the n8n Webhook node
// Optional env:
//   N8N_WEBHOOK_SECRET     — sent as X-Webhook-Secret so the workflow can
//                            reject calls that aren't from this backend.
//   SMTP_FROM_EMAIL        — From address (default: support@classpulse.ai)
//   SMTP_FROM_NAME         — From display name (default: ClassPulse AI)

import { logger } from "./logger";

export type EmailDeliveryStatus = "sent" | "skipped" | "failed";
export type EmailDeliveryResult = { status: EmailDeliveryStatus; error: string | null };

function fromIdentity(): { email: string; name: string } {
  return {
    email: (process.env.SMTP_FROM_EMAIL ?? "support@classpulse.ai").trim(),
    name: (process.env.SMTP_FROM_NAME ?? "ClassPulse AI").trim() || "ClassPulse AI",
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderBodies(opts: {
  teacherName: string;
  studentName: string;
  subject: string;
  scheduledAtPretty: string;
  overallScore: number | null;
  aiSummary: string | null;
}): { textBody: string; htmlBody: string } {
  const { teacherName, studentName, subject, scheduledAtPretty, overallScore, aiSummary } = opts;
  const scoreLine =
    overallScore != null ? `Overall session score: ${overallScore} / 100` : "";
  const summaryBlock = aiSummary
    ? `\n\nSummary:\n${aiSummary}\n`
    : "";
  const textBody = [
    `Hi ${teacherName || "there"},`,
    "",
    `Your ClassPulse AI report for ${studentName}'s ${subject} session on ${scheduledAtPretty} is attached as a PDF.`,
    scoreLine,
    summaryBlock,
    "",
    "Open the attachment for the full breakdown — engagement, confusion, mood timeline, and the AI's intervention suggestions.",
    "",
    "— ClassPulse AI",
  ]
    .filter(Boolean)
    .join("\n");

  const summaryHtml = aiSummary
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;background:#FFF1E6;border-left:3px solid #FF7A00;padding:12px 14px;border-radius:8px;color:#1E2A5E;">${escapeHtml(
        aiSummary,
      )}</p>`
    : "";
  const scoreHtml =
    overallScore != null
      ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;"><strong>Overall session score:</strong> <span style="color:#FF7A00;font-weight:700;">${overallScore} / 100</span></p>`
      : "";
  const htmlBody = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FFF8F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F2;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;box-shadow:0 4px 16px rgba(255,122,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(90deg,#FF7A00,#FFB066);padding:24px 32px;color:#FFFFFF;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">ClassPulse AI</div>
              <div style="font-size:20px;font-weight:600;margin-top:4px;">Session report ready</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Hi ${escapeHtml(teacherName || "there")},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">
                The AI report for <strong>${escapeHtml(studentName)}</strong>'s
                <strong>${escapeHtml(subject)}</strong> session on
                <strong>${escapeHtml(scheduledAtPretty)}</strong> is attached as a PDF.
              </p>
              ${scoreHtml}
              ${summaryHtml}
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">
                Open the attachment for the full breakdown — engagement, confusion, mood timeline, and the AI's intervention suggestions.
              </p>
              <p style="margin:24px 0 0;font-size:16px;line-height:1.55;">
                <span style="color:#FF7A00;font-weight:600;">— ClassPulse AI</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#FFF8F2;color:#7A6A5C;font-size:12px;text-align:center;">
              Automated delivery from ClassPulse AI. Reply to reach your team.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { textBody, htmlBody };
}

export async function sendReportEmail(args: {
  toEmail: string;
  teacherName: string;
  studentName: string;
  subject: string;
  scheduledAtPretty: string;
  pdfUrl: string;
  pdfFilename: string;
  overallScore?: number | null;
  aiSummary?: string | null;
  reportId?: number | string | null;
}): Promise<EmailDeliveryResult> {
  const webhookUrl = (process.env.N8N_EMAIL_WEBHOOK_URL ?? "").trim();
  if (!webhookUrl) {
    logger.info("Email skipped: N8N_EMAIL_WEBHOOK_URL not configured");
    return { status: "skipped", error: "n8n_webhook_not_configured" };
  }
  if (!args.toEmail) return { status: "skipped", error: "no_recipient" };
  if (!args.pdfUrl) return { status: "skipped", error: "no_pdf_url" };

  const from = fromIdentity();
  const { textBody, htmlBody } = renderBodies({
    teacherName: args.teacherName,
    studentName: args.studentName,
    subject: args.subject,
    scheduledAtPretty: args.scheduledAtPretty,
    overallScore: args.overallScore ?? null,
    aiSummary: args.aiSummary ?? null,
  });

  const payload = {
    report_id: args.reportId ?? null,
    to_email: args.toEmail,
    student_name: args.studentName,
    subject_line: `${args.studentName}'s ${args.subject} session report`,
    subject: `${args.studentName}'s ${args.subject} session report`,
    pdf_url: args.pdfUrl,
    pdf_filename: args.pdfFilename,
    from_email: from.email,
    from_name: from.name,
    html_body: htmlBody,
    text_body: textBody,
  };

  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = (process.env.N8N_WEBHOOK_SECRET ?? "").trim();
  if (secret) headers["X-Webhook-Secret"] = secret;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (resp.ok) {
      logger.info(
        { toEmail: args.toEmail, studentName: args.studentName, status: resp.status },
        "Email handed off to n8n",
      );
      return { status: "sent", error: null };
    }
    const bodyExcerpt = (await resp.text().catch(() => "")).slice(0, 200);
    logger.error(
      { toEmail: args.toEmail, status: resp.status, body: bodyExcerpt },
      "n8n webhook returned non-2xx",
    );
    return {
      status: "failed",
      error: `webhook_status_${resp.status}: ${bodyExcerpt}`.slice(0, 300),
    };
  } catch (e) {
    const err = e as Error;
    logger.error({ err, toEmail: args.toEmail }, "n8n webhook call failed");
    return {
      status: "failed",
      error: `webhook_error: ${err.name}: ${err.message.slice(0, 200)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
