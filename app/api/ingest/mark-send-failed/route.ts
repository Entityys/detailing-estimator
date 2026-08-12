import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const { queueItemId, reason } = await req.json();
  if (!queueItemId) return NextResponse.json({ error: "queueItemId required" }, { status: 400 });

  await sql`UPDATE queue_items SET send_attempts = send_attempts + 1 WHERE id = ${queueItemId}`;
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, 'send_failed', ${reason ?? null})`;

  return NextResponse.json({ ok: true });
}
