// Renders the frontend's /reports/:id/print route to a single-page PDF via
// Playwright, then uploads to Supabase Storage and returns the public URL.
//
// Requires:
//   - playwright (npm) + `npx playwright install chromium` once at deploy time
//   - FRONTEND_URL pointing at a running frontend (default http://localhost:24724)
//   - Supabase env vars from ./storage
//
// Lazy-imports playwright so the API server boots even when the browser
// binary hasn't been installed yet (e.g. local dev without PDF testing).

import { logger } from "./logger";
import { uploadReportPdf } from "./storage";

const PDF_TIMEOUT_MS = Number(process.env.PTM_PDF_TIMEOUT_MS ?? 30_000);

export async function renderReportPdfBytes(
  reportId: number | string,
  opts: { authToken?: string } = {},
): Promise<Uint8Array> {
  const playwright = await import("playwright");
  const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:24724").replace(/\/$/, "");
  const url = `${frontendUrl}/reports/${reportId}/print`;

  const browser = await playwright.chromium.launch();
  try {
    // Viewport tall enough that even a long report fits without triggering
    // min-h-screen tricks that would crop measurements.
    const context = await browser.newContext({ viewport: { width: 900, height: 8000 } });

    // The print page calls /api/reports/:id, which requires auth. Playwright
    // has empty localStorage, so without injecting a token the React Query
    // call 401s and the page renders "Report not found." Setting the token
    // via addInitScript runs BEFORE any frame scripts on every document,
    // so the API client picks it up.
    if (opts.authToken) {
      const safeToken = opts.authToken.replace(/[\\'"]/g, "");
      await context.addInitScript(
        `try { window.localStorage.setItem("sheldon_token", "${safeToken}"); } catch (e) {}`,
      );
    }

    const page = await context.newPage();

    // Use screen media so the on-screen layout renders as-is — yields one
    // long continuous PDF page matching what the teacher sees in the app.
    await page.emulateMedia({ media: "screen" });

    const response = await page.goto(url, { waitUntil: "load", timeout: PDF_TIMEOUT_MS });
    logger.info(
      { url, status: response?.status() ?? null },
      "Playwright navigated to print page",
    );

    // Wait for the print page to finish fetching its data. The print page
    // sets data-ready="true" on .page-wrap only after useGetReport resolves;
    // without this the PDF captures the "Loading report…" placeholder.
    await page.waitForSelector('.page-wrap[data-ready="true"]', {
      state: "attached",
      timeout: PDF_TIMEOUT_MS,
    });

    // Hide any editor / toolbar chrome AND zero out body/page-wrap margins so
    // the PDF has no dead space.
    await page.addStyleTag({
      content: `
        .no-print { display: none !important; }
        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        .page-wrap { margin: 0 auto !important; box-shadow: none !important; }
      `,
    });
    // Let fonts / images / layout settle after the data lands.
    await page.waitForTimeout(400);

    // Measure the actual rendered page-wrap so the PDF is sized exactly to
    // its content — no pagination, no blank-tail page. The callback runs in
    // the browser context, so we pass it as a string to keep the Node
    // tsconfig from requiring the DOM lib.
    const dims = (await page.evaluate(`
      (() => {
        document.documentElement.style.height = "auto";
        document.body.style.height = "auto";
        document.body.style.minHeight = "0";
        const wrap = document.querySelector(".page-wrap");
        if (wrap) {
          wrap.style.height = "auto";
          wrap.style.minHeight = "0";
        }
        const el = wrap || document.body;
        const rect = el.getBoundingClientRect();
        return {
          width: Math.ceil(rect.width || el.scrollWidth),
          height: Math.ceil(el.scrollHeight),
        };
      })()
    `)) as { width: number; height: number };

    const widthPx = Math.max(dims.width, 600);
    const heightPx = Math.max(dims.height, 600);
    logger.info({ widthPx, heightPx }, "Rendering single-page PDF");

    const pdfBuffer = await page.pdf({
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    logger.info({ bytes: pdfBuffer.length }, "Playwright produced PDF");
    return new Uint8Array(pdfBuffer);
  } finally {
    await browser.close();
  }
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
