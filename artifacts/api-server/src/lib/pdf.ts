// Renders the frontend's /reports/:id/print route to a PDF via PDFShift
// (hosted Chromium-as-a-service) and uploads the bytes to Supabase Storage.
//
// Why not run a headless browser ourselves? On Render's native Node runtime,
// Playwright was unreliable — ~/.cache wasn't preserved between build and
// runtime, and apt-get during build didn't have the privileges Chromium's
// system libs require. A hosted service sidesteps all of that.
//
// Required env:
//   PDFSHIFT_API_KEY      — API key from https://pdfshift.io
//   FRONTEND_URL          — public URL of the frontend (PDFShift's servers
//                           must be able to reach this; localhost won't work)

import { logger } from "./logger";
import { uploadReportPdf } from "./storage";

const PDFSHIFT_URL = "https://api.pdfshift.io/v3/convert/pdf";
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS ?? 60_000);

function normalizeFrontendUrl(raw: string | undefined): string {
  // Strip whitespace, surrounding quotes (pasting from a dashboard sometimes
  // brings them along), trailing slashes.
  let v = (raw ?? "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  v = v.replace(/\/+$/, "");
  if (!v) return v;
  // Auto-prefix protocol — a value like `super-sheldon-web.onrender.com`
  // would otherwise blow up new URL() with "Invalid URL".
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return v;
}

function buildSourceUrl(reportId: number | string, authToken?: string): string {
  const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);
  if (!frontendUrl) {
    throw new Error(
      "FRONTEND_URL must be set so PDFShift knows which URL to render. Local " +
        "PDF rendering requires a public tunnel — PDFShift's servers can't " +
        "reach localhost.",
    );
  }
  let url: URL;
  try {
    url = new URL(`${frontendUrl}/reports/${reportId}/print`);
  } catch {
    throw new Error(
      `FRONTEND_URL is not a valid URL: "${process.env.FRONTEND_URL}". Expected ` +
        `something like https://super-sheldon-web.onrender.com (with the https:// prefix).`,
    );
  }
  if (authToken) url.searchParams.set("token", authToken);
  return url.toString();
}

export async function renderReportPdfBytes(
  reportId: number | string,
  opts: { authToken?: string } = {},
): Promise<Uint8Array> {
  const apiKey = (process.env.PDFSHIFT_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error(
      "PDFSHIFT_API_KEY is not set. Add it to the api-server .env or Render env.",
    );
  }
  const normalized = normalizeFrontendUrl(process.env.FRONTEND_URL);
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(normalized)) {
    throw new Error(
      "FRONTEND_URL points at localhost — PDFShift can't reach it. Deploy to " +
        "Render (or expose via ngrok) before rendering PDFs.",
    );
  }

  const sourceUrl = buildSourceUrl(reportId, opts.authToken);
  logger.info({ reportId, sourceUrl: sourceUrl.replace(/token=[^&]+/, "token=***") }, "PDFShift render starting");

  const body = {
    source: sourceUrl,
    // PDFShift's `wait_for` expects a JS function name defined on the page,
    // not a CSS selector. The print page exposes `window.pdfshiftReady`
    // which returns true once useGetReport resolves and the .page-wrap is
    // mounted with data-ready="true". Without this we'd capture the
    // "Loading report…" placeholder.
    wait_for: "pdfshiftReady",
    // Render with screen media (matches how the page was designed). The
    // page already caps itself at 21cm width which matches A4.
    use_print: false,
    // Match the SVG/img-heavy print layout: don't strip colors.
    sandbox: false,
    // PDFShift's free tier caps timeout at 30s. That's the page-render
    // budget on their end; our overall HTTP fetch still has its own
    // AbortController timeout (PDF_TIMEOUT_MS) wrapping the whole call.
    timeout: 30,
  };

  // PDFShift uses HTTP Basic auth with username "api" and password = key.
  const authHeader = "Basic " + Buffer.from(`api:${apiKey}`).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(PDFSHIFT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const err = e as Error;
    throw new Error(
      err.name === "AbortError"
        ? `PDFShift request timed out after ${PDF_TIMEOUT_MS}ms`
        : `PDFShift network error: ${err.message}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    // PDFShift returns JSON for errors, e.g. invalid URL / quota exceeded /
    // unreachable source. Surface the message so the caller (and the
    // delivery_logs row) has something actionable.
    const detail = await resp.text().catch(() => "");
    throw new Error(
      `PDFShift returned HTTP ${resp.status}: ${detail.slice(0, 400) || resp.statusText}`,
    );
  }

  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.byteLength < 200) {
    // Sanity check — a real PDF is at least a few KB. If we got something
    // tiny here it's almost certainly an error response we mis-detected.
    const preview = Buffer.from(bytes).toString("utf8");
    throw new Error(`PDFShift returned unexpectedly small payload: ${preview}`);
  }
  logger.info({ reportId, bytes: bytes.byteLength }, "PDFShift produced PDF");
  return bytes;
}

export async function generateAndStoreReportPdf(
  reportId: number | string,
  opts: { authToken?: string } = {},
): Promise<string> {
  const bytes = await renderReportPdfBytes(reportId, opts);
  const url = await uploadReportPdf(bytes, reportId);
  logger.info({ reportId, url }, "Report PDF stored");
  return url;
}
