// Supabase Storage adapter — uploads PDF bytes and returns the public URL.
//
// Requires env vars:
//   SUPABASE_URL          — project URL (e.g. https://xyz.supabase.co)
//   SUPABASE_KEY          — service-role key (NOT the anon key; uploads need
//                           service-role so we don't have to wire RLS to a
//                           teacher identity). SUPABASE_SERVICE_KEY is
//                           accepted as a fallback for ptm-agent parity.
//
// The bucket REPORTS_BUCKET must exist and be public-read so the parent /
// teacher email and the frontend download link can fetch the PDF directly.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

export const REPORTS_BUCKET = "classpulse-reports";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY must be set to upload report PDFs",
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function uploadReportPdf(
  pdfBytes: Uint8Array,
  reportId: number | string,
): Promise<string> {
  const fileName = `${reportId}/${Date.now()}.pdf`;
  const bucket = getClient().storage.from(REPORTS_BUCKET);
  const { error } = await bucket.upload(fileName, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    logger.error({ err: error, fileName }, "Supabase upload failed");
    throw new Error(`Supabase upload failed: ${error.message}`);
  }
  const { data } = bucket.getPublicUrl(fileName);
  return data.publicUrl;
}
