import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Items whose real-world status might have moved on in Flyra since we last
// checked (estimate viewed/accepted/declined, job scheduled/completed).
export async function GET(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const rows = (await sql`
    SELECT id, flyra_lead_id, flyra_estimate_id, phone, customer_name, status
    FROM queue_items
    WHERE status IN ('sent', 'accepted', 'scheduled') AND flyra_estimate_id IS NOT NULL
    ORDER BY sent_at ASC
  `) as {
    id: number;
    flyra_lead_id: string;
    flyra_estimate_id: string;
    phone: string | null;
    customer_name: string | null;
    status: string;
  }[];

  return NextResponse.json(
    rows.map((r) => ({
      queueItemId: r.id,
      leadId: r.flyra_lead_id,
      estimateId: r.flyra_estimate_id,
      phone: r.phone,
      customerName: r.customer_name,
      currentStatus: r.status,
    }))
  );
}
