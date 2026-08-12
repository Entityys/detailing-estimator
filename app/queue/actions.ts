"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCategory, getPriceCents, SIZE_TIER_LABELS, type SizeTier } from "@/lib/priceBook";

async function logEvent(queueItemId: number, event: string, detail?: string) {
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${queueItemId}, ${event}, ${detail ?? null})`;
}

export async function updateTierAndCategory(queueItemId: number, formData: FormData) {
  await requireSession();

  const tier = String(formData.get("tier")) as SizeTier;
  const categoryId = String(formData.get("categoryId"));

  const priceCents = getPriceCents(categoryId, tier);
  if (priceCents === undefined) {
    throw new Error(`No price for ${categoryId} at tier ${tier}`);
  }

  const [row] = (await sql`SELECT travel_fee_cents FROM queue_items WHERE id = ${queueItemId}`) as {
    travel_fee_cents: number;
  }[];
  const total = priceCents + (row?.travel_fee_cents ?? 0);

  await sql`
    UPDATE queue_items
    SET matched_tier = ${tier},
        tier_confidence = 'CONFIDENT',
        tier_reason = 'Manually set by owner',
        matched_category_id = ${categoryId},
        category_confidence = 'CONFIDENT',
        category_reason = 'Manually set by owner',
        base_price_cents = ${priceCents},
        total_price_cents = ${total}
    WHERE id = ${queueItemId}
  `;

  await logEvent(queueItemId, "edited", `Set to ${SIZE_TIER_LABELS[tier]} / ${getCategory(categoryId)?.name}`);
  revalidatePath("/queue");
}

export async function rejectItem(queueItemId: number, _formData: FormData) {
  await requireSession();
  await sql`UPDATE queue_items SET status = 'rejected', reviewed_at = now() WHERE id = ${queueItemId}`;
  await logEvent(queueItemId, "rejected");
  revalidatePath("/queue");
}

// This only flips the status — it does NOT talk to Flyra. The dashboard
// (Vercel) has no path to Flyra's leads/estimates/SMS surface, since those
// only exist via the MCP tool interface, not the public REST API. The
// scheduled cloud routine (which does have MCP access) picks up
// status='approved' rows on its next run, creates the real Flyra estimate,
// sends it, and writes flyra_estimate_id/link + status='sent' back here.
export async function approve(queueItemId: number, _formData: FormData) {
  await requireSession();

  const [item] = (await sql`SELECT status, matched_tier, matched_category_id, phone FROM queue_items WHERE id = ${queueItemId}`) as {
    status: string;
    matched_tier: SizeTier | null;
    matched_category_id: string | null;
    phone: string | null;
  }[];
  if (!item) throw new Error("Queue item not found");
  if (item.status !== "pending") throw new Error(`Item is already ${item.status}`);
  if (!item.matched_tier || !item.matched_category_id) {
    throw new Error("Set a vehicle size and service before approving");
  }
  if (!item.phone) throw new Error("No phone number on this lead — can't send");

  await sql`UPDATE queue_items SET status = 'approved', reviewed_at = now() WHERE id = ${queueItemId}`;
  await logEvent(queueItemId, "approved", "Waiting for the scheduled automation to actually send it via Flyra");
  revalidatePath("/queue");
}
