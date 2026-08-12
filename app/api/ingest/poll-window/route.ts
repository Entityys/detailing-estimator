import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: what `since` timestamp to pass to flyra_list_leads so old leads
// aren't re-fetched every run. Defaults to 48h ago on first call.
export async function GET(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const rows = (await sql`SELECT last_checked_at FROM poll_state WHERE id = 1`) as {
    last_checked_at: string | null;
  }[];

  const since = rows[0]?.last_checked_at || new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  return NextResponse.json({ since });
}

// POST: record that a poll pass completed.
export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  await sql`
    INSERT INTO poll_state (id, last_checked_at) VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET last_checked_at = now()
  `;
  return NextResponse.json({ ok: true });
}
