/**
 * Prints queue items the owner has approved on the dashboard but that
 * haven't been sent through Flyra yet. The agent reads this, then for each
 * item calls flyra_create_estimate / flyra_send_estimate / flyra_get_estimate_link
 * / flyra_send_sms itself (this script has no Flyra access), then calls
 * mark-sent.ts or mark-send-failed.ts with the result.
 *
 * Caps at 3 send attempts per item so a persistently-broken row doesn't
 * retry forever and spam Flyra — after that it stays "approved" but won't
 * appear here again until send_attempts is reset manually.
 *
 * Usage: npx tsx scripts/agent/list-approved.ts
 */
import { sql } from "../../lib/db";
import { getCategory, getPriceCents, SIZE_TIER_LABELS } from "../../lib/priceBook";

async function main() {
  const rows = (await sql`
    SELECT id, flyra_lead_id, customer_name, phone, city, matched_tier, matched_category_id,
           base_price_cents, travel_fee_cents, total_price_cents, send_attempts
    FROM queue_items
    WHERE status = 'approved' AND send_attempts < 3
    ORDER BY created_at ASC
  `) as {
    id: number;
    flyra_lead_id: string;
    customer_name: string | null;
    phone: string | null;
    city: string | null;
    matched_tier: string;
    matched_category_id: string;
    base_price_cents: number;
    travel_fee_cents: number;
    total_price_cents: number;
    send_attempts: number;
  }[];

  const enriched = rows.map((r) => {
    const category = getCategory(r.matched_category_id);
    return {
      queueItemId: r.id,
      leadId: r.flyra_lead_id,
      customerName: r.customer_name,
      phone: r.phone,
      city: r.city,
      lineItems: [
        {
          name: `${category?.name ?? r.matched_category_id} (${SIZE_TIER_LABELS[r.matched_tier as keyof typeof SIZE_TIER_LABELS]})`,
          description: category?.description ?? "",
          qty: 1,
          unit_price_cents: r.base_price_cents,
          taxable: true,
        },
        ...(r.travel_fee_cents > 0
          ? [
              {
                name: "Travel Fee",
                description: `Outside the no-fee service area (${r.city ?? "unknown city"})`,
                qty: 1,
                unit_price_cents: r.travel_fee_cents,
                taxable: false,
              },
            ]
          : []),
      ],
      totalCents: r.total_price_cents,
    };
  });

  console.log(JSON.stringify(enriched, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.message || err) }));
  process.exit(1);
});
