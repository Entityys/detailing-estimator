/**
 * Used by the scheduled cloud routine. It calls the flyra_get_lead MCP tool
 * itself (this script has no Flyra access), then pipes the raw lead JSON in
 * here on stdin. This script does all the deterministic work — extraction,
 * classification, pricing, zone/fee — and writes the result to Postgres, so
 * the agent doesn't have to "reason" about pricing (keeps it consistent with
 * what the dashboard shows/edits).
 *
 * Usage: echo '<lead json>' | npx tsx scripts/agent/queue-lead.ts
 *
 * Prints one JSON line describing what happened and — importantly — what SMS
 * (if any) the agent should send next, since only the agent can call
 * flyra_send_sms.
 */
import { initSchema, seedVehicleMapIfEmpty, sql } from "../../lib/db";
import { classifyVehicle } from "../../lib/classify";
import { matchServiceCategory, getPriceCents } from "../../lib/priceBook";
import { evaluateZone } from "../../lib/zones";
import { extractLeadInfo, type FlyraLead } from "../../lib/leadExtract";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const raw = await readStdin();
  const lead = JSON.parse(raw) as FlyraLead;

  await initSchema();
  await seedVehicleMapIfEmpty();

  const info = extractLeadInfo(lead);
  const tierResult = await classifyVehicle(info.vehicleText);
  const categoryResult = matchServiceCategory(info.serviceText);
  const zone = evaluateZone(info.city, lead.state);

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

  const inserted = (await sql`
    INSERT INTO queue_items (
      flyra_lead_id, customer_name, phone, city, raw_vehicle_text, raw_service_text,
      matched_tier, tier_confidence, tier_reason,
      matched_category_id, category_confidence, category_reason,
      base_price_cents, travel_fee_cents, total_price_cents, zone_reason, far_out_of_area,
      status
    ) VALUES (
      ${lead.id}, ${info.customerName}, ${info.phone}, ${info.city}, ${info.vehicleText}, ${info.serviceText},
      ${tierResult.tier}, ${tierResult.confidence}, ${tierResult.reason},
      ${categoryResult.categoryId}, ${categoryResult.ambiguous ? "AMBIGUOUS" : "CONFIDENT"}, ${categoryResult.reason},
      ${baseCents}, ${zone.feeCents}, ${totalCents}, ${zone.reason}, ${zone.farOutOfArea},
      ${status}
    )
    ON CONFLICT (flyra_lead_id) DO NOTHING
    RETURNING id
  `) as { id: number }[];

  if (inserted.length === 0) {
    console.log(JSON.stringify({ inserted: false, leadId: lead.id }));
    return;
  }
  const queueItemId = inserted[0].id;

  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, 'queued', ${`${tierResult.reason} | ${categoryResult.reason} | ${zone.reason}`})`;

  const firstName = info.customerName.split(" ")[0];
  const priceStr = totalCents !== null ? `$${(totalCents / 100).toFixed(2)}` : "price TBD";

  const result = {
    inserted: true,
    queueItemId,
    leadId: lead.id,
    status,
    sms: isMissingInfo && info.phone
      ? {
          toPhone: info.phone,
          body: `Hi ${firstName}, thanks for reaching out to Entity Mobile Detailing! What vehicle (year/make/model) would you like serviced? That's the last thing we need to get you a quote.`,
          reason: "missing_vehicle_info",
        }
      : {
          toOwner: true,
          body: `New estimate to review: ${info.customerName} — ${info.vehicleText ?? "?"} — ${priceStr}. Open the dashboard to approve.`,
          reason: "owner_review_needed",
        },
  };
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.message || err) }));
  process.exit(1);
});
