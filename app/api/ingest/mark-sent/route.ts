import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const { queueItemId, estimateId, link } = await req.json();
  if (!queueItemId || !estimateId || !link) {
    return NextResponse.json({ error: "queueItemId, estimateId, link required" }, { status: 400 });
  }

  await sql`
    UPDATE queue_items
    SET status = 'sent', flyra_estimate_id = ${estimateId}, flyra_estimate_link = ${link}, sent_at = now()
    WHERE id = ${queueItemId}
  `;
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, 'sent', ${`Estimate ${estimateId}`})`;

  return NextResponse.json({ ok: true });
}
