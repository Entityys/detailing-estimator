import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";
import { getCategory, SIZE_TIER_LABELS } from "@/lib/priceBook";

export const dynamic = "force-dynamic";

// Owner-approved queue items not yet sent through Flyra. Capped at 3 send
// attempts so a persistently-broken row doesn't retry forever.
export async function GET(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const rows = (await sql`
    SELECT id, flyra_lead_id, customer_name, phone, city, matched_tier, matched_category_id,
           base_price_cents, travel_fee_cents, total_price_cents, send_attempts, addons,
           adjustment_cents, adjustment_reason
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
    addons: { id: string; name: string; priceCents: number }[];
    adjustment_cents: number;
    adjustment_reason: string | null;
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
        ...r.addons.map((a) => ({
          name: a.name,
          description: "",
          qty: 1,
          unit_price_cents: a.priceCents,
          taxable: true,
        })),
        ...(r.adjustment_cents !== 0
          ? [
              {
                name: "Adjustment",
                description: r.adjustment_reason ?? "",
                qty: 1,
                unit_price_cents: r.adjustment_cents,
                taxable: false,
              },
            ]
          : []),
      ],
      totalCents: r.total_price_cents,
    };
  });

  return NextResponse.json(enriched);
}
