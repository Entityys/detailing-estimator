import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";
import { classifyVehicle } from "@/lib/classify";
import { matchServiceCategory, getPriceCents, suggestAddOns } from "@/lib/priceBook";
import { evaluateZone } from "@/lib/zones";
import { extractLeadInfo, type FlyraLead } from "@/lib/leadExtract";
import { renderTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

// Once a queue item reaches one of these, a new submission from the same
// phone number should NOT merge into it — it's done, so treat the new
// submission as its own fresh lead instead.
const TERMINAL_STATUSES = ["sent", "accepted", "declined", "scheduled", "completed", "rejected", "deleted"];

// Called by the scheduled automation once per new Flyra lead. The automation
// itself has no database access — it calls flyra_get_lead (MCP), POSTs the
// raw lead JSON here, and this route does all the deterministic
// extraction/classification/pricing/insert work, keeping that logic in one
// place (shared with what the dashboard displays/edits).
export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const lead = (await req.json()) as FlyraLead;
  if (!lead?.id) return NextResponse.json({ error: "missing lead.id" }, { status: 400 });

  const info = extractLeadInfo(lead);
  const tierResult = await classifyVehicle(info.vehicleText);
  const categoryResult = matchServiceCategory(info.serviceText);
  const zone = evaluateZone(info.city, lead.state);
  const suggestedAddonIds = suggestAddOns(info.serviceText);

  let baseCents: number | null = null;
  let totalCents: number | null = null;
  if (tierResult.tier && categoryResult.categoryId) {
    const price = getPriceCents(categoryResult.categoryId, tierResult.tier);
    if (price !== undefined) {
      baseCents = price;
      totalCents = price + zone.feeCents;
    }
  }

  const isMissingInfo = !info.vehicleText;
  const status = isMissingInfo ? "missing_info" : "pending";

  // Same person submitting the lead form twice (still-open thread) merges
  // into the existing card instead of creating a second one.
  let existingActiveId: number | null = null;
  if (info.phone) {
    const existing = (await sql`
      SELECT id FROM queue_items
      WHERE phone = ${info.phone} AND NOT (status = ANY(${TERMINAL_STATUSES})) AND flyra_lead_id != ${lead.id}
      ORDER BY created_at DESC LIMIT 1
    `) as { id: number }[];
    if (existing.length > 0) existingActiveId = existing[0].id;
  }

  let queueItemId: number;
  let merged = false;

  if (existingActiveId !== null) {
    queueItemId = existingActiveId;
    merged = true;
    await sql`
      UPDATE queue_items SET
        flyra_lead_id = ${lead.id}, customer_name = ${info.customerName}, city = ${info.city},
        raw_vehicle_text = ${info.vehicleText}, raw_service_text = ${info.serviceText},
        matched_tier = ${tierResult.tier}, tier_confidence = ${tierResult.confidence}, tier_reason = ${tierResult.reason},
        matched_category_id = ${categoryResult.categoryId},
        category_confidence = ${categoryResult.ambiguous ? "AMBIGUOUS" : "CONFIDENT"}, category_reason = ${categoryResult.reason},
        base_price_cents = ${baseCents}, travel_fee_cents = ${zone.feeCents}, total_price_cents = ${totalCents},
        zone_reason = ${zone.reason}, far_out_of_area = ${zone.farOutOfArea},
        suggested_addon_ids = ${JSON.stringify(suggestedAddonIds)}::jsonb,
        status = ${status}
      WHERE id = ${queueItemId}
    `;
    await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, 'merged_duplicate', ${`Re-submitted as lead ${lead.id}, same phone`})`;
  } else {
    const inserted = (await sql`
      INSERT INTO queue_items (
        flyra_lead_id, customer_name, phone, city, raw_vehicle_text, raw_service_text,
        matched_tier, tier_confidence, tier_reason,
        matched_category_id, category_confidence, category_reason,
        base_price_cents, travel_fee_cents, total_price_cents, zone_reason, far_out_of_area,
        suggested_addon_ids, status
      ) VALUES (
        ${lead.id}, ${info.customerName}, ${info.phone}, ${info.city}, ${info.vehicleText}, ${info.serviceText},
        ${tierResult.tier}, ${tierResult.confidence}, ${tierResult.reason},
        ${categoryResult.categoryId}, ${categoryResult.ambiguous ? "AMBIGUOUS" : "CONFIDENT"}, ${categoryResult.reason},
        ${baseCents}, ${zone.feeCents}, ${totalCents}, ${zone.reason}, ${zone.farOutOfArea},
        ${JSON.stringify(suggestedAddonIds)}::jsonb, ${status}
      )
      ON CONFLICT (flyra_lead_id) DO NOTHING
      RETURNING id
    `) as { id: number }[];

    if (inserted.length === 0) {
      return NextResponse.json({ inserted: false, leadId: lead.id });
    }
    queueItemId = inserted[0].id;
    await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, 'queued', ${`${tierResult.reason} | ${categoryResult.reason} | ${zone.reason}`})`;
  }

  const firstName = info.customerName.split(" ")[0];
  const priceStr = totalCents !== null ? `$${(totalCents / 100).toFixed(2)}` : "price TBD";

  const smsBody =
    isMissingInfo && info.phone
      ? await renderTemplate("missing_info", { firstName })
      : await renderTemplate("owner_notification", {
          customerName: info.customerName,
          vehicle: info.vehicleText ?? "?",
          price: priceStr,
        });

  return NextResponse.json({
    inserted: true,
    merged,
    queueItemId,
    leadId: lead.id,
    status,
    sms: isMissingInfo && info.phone
      ? { toPhone: info.phone, body: smsBody, reason: "missing_vehicle_info" }
      : { toOwner: true, body: smsBody, reason: "owner_review_needed" },
  });
}
