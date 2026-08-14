import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";
import { renderTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

// Sent estimates with auto-follow-up on, due for their day-1 or day-3 nudge.
// The scheduled automation calls this, sends each rendered message via
// Flyra, then POSTs /api/ingest/mark-followup-sent to advance the stage.
export async function GET(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const rows = (await sql`
    SELECT id, customer_name, phone, flyra_lead_id, flyra_estimate_link, followup_stage
    FROM queue_items
    WHERE status = 'sent' AND auto_followup = true AND phone IS NOT NULL
      AND (
        (followup_stage = 'awaiting_day1' AND sent_at <= now() - interval '1 day')
        OR (followup_stage = 'awaiting_day3' AND followup_day1_sent_at <= now() - interval '2 days')
      )
    ORDER BY sent_at ASC
  `) as {
    id: number;
    customer_name: string | null;
    phone: string;
    flyra_lead_id: string;
    flyra_estimate_link: string | null;
    followup_stage: "awaiting_day1" | "awaiting_day3";
  }[];

  const due = await Promise.all(
    rows.map(async (r) => {
      const stage = r.followup_stage === "awaiting_day1" ? "day1" : "day3";
      const firstName = (r.customer_name || "there").split(" ")[0];
      const body = await renderTemplate(`followup_${stage}`, {
        firstName,
        link: r.flyra_estimate_link ?? "",
      });
      return {
        queueItemId: r.id,
        leadId: r.flyra_lead_id,
        phone: r.phone,
        customerName: r.customer_name,
        stage,
        message: body,
      };
    })
  );

  return NextResponse.json(due);
}
