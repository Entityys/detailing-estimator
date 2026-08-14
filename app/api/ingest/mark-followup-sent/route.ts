import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const { queueItemId, stage } = await req.json();
  if (!queueItemId || (stage !== "day1" && stage !== "day3")) {
    return NextResponse.json({ error: "queueItemId and stage ('day1' | 'day3') required" }, { status: 400 });
  }

  if (stage === "day1") {
    await sql`
      UPDATE queue_items
      SET followup_stage = 'awaiting_day3', followup_day1_sent_at = now()
      WHERE id = ${queueItemId}
    `;
  } else {
    await sql`
      UPDATE queue_items
      SET followup_stage = 'done', followup_day3_sent_at = now()
      WHERE id = ${queueItemId}
    `;
  }
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, ${`followup_${stage}_sent`}, NULL)`;

  return NextResponse.json({ ok: true });
}
