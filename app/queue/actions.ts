"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCategory, getPriceCents, getAddOn, SIZE_TIER_LABELS, type SizeTier } from "@/lib/priceBook";

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

  const [row] = (await sql`SELECT travel_fee_cents, adjustment_cents FROM queue_items WHERE id = ${queueItemId}`) as {
    travel_fee_cents: number;
    adjustment_cents: number;
  }[];
  const total = priceCents + (row?.travel_fee_cents ?? 0) + (row?.adjustment_cents ?? 0);

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

// Soft-delete: hides the card from the pipeline but keeps the row (and its
// audit trail) intact for History — for spam/test leads and duplicate
// cleanup that auto-merge-by-phone didn't catch.
export async function deleteItem(queueItemId: number, formData: FormData) {
  await requireSession();
  const reason = String(formData.get("reason") || "").trim();
  await sql`UPDATE queue_items SET status = 'deleted', reviewed_at = now() WHERE id = ${queueItemId}`;
  await logEvent(queueItemId, "deleted", reason || undefined);
  revalidatePath("/queue");
  revalidatePath("/log");
}

// This only flips status/pricing fields — it does NOT talk to Flyra. The
// dashboard (Vercel) has no path to Flyra's leads/estimates/SMS surface,
// since those only exist via the MCP tool interface, not the public REST
// API. The scheduled cloud routine (which does have MCP access) picks up
// status='approved' rows on its next run, creates the real Flyra estimate
// (with these exact add-ons/adjustment as extra line items), sends it, and
// writes flyra_estimate_id/link + status='sent' back here.
export async function approve(queueItemId: number, formData: FormData) {
  await requireSession();

  const [item] = (await sql`
    SELECT status, matched_tier, matched_category_id, phone, base_price_cents, travel_fee_cents
    FROM queue_items WHERE id = ${queueItemId}
  `) as {
    status: string;
    matched_tier: SizeTier | null;
    matched_category_id: string | null;
    phone: string | null;
    base_price_cents: number | null;
    travel_fee_cents: number;
  }[];
  if (!item) throw new Error("Queue item not found");
  if (item.status !== "pending") throw new Error(`Item is already ${item.status}`);
  if (!item.matched_tier || !item.matched_category_id) {
    throw new Error("Set a vehicle size and service before approving");
  }
  if (!item.phone) throw new Error("No phone number on this lead — can't send");

  const selectedAddonIds = formData.getAll("addonIds").map(String);
  const addons = selectedAddonIds
    .map((id) => getAddOn(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents }));
  const addonsTotal = addons.reduce((sum, a) => sum + a.priceCents, 0);

  const adjustmentRaw = String(formData.get("adjustmentDollars") || "0").trim();
  const adjustmentReason = String(formData.get("adjustmentReason") || "").trim();
  const adjustmentCents = Math.round((parseFloat(adjustmentRaw) || 0) * 100);
  if (adjustmentCents !== 0 && !adjustmentReason) {
    throw new Error("A price adjustment needs a short reason");
  }

  const total = (item.base_price_cents ?? 0) + item.travel_fee_cents + addonsTotal + adjustmentCents;

  await sql`
    UPDATE queue_items
    SET status = 'approved',
        reviewed_at = now(),
        addons = ${JSON.stringify(addons)}::jsonb,
        adjustment_cents = ${adjustmentCents},
        adjustment_reason = ${adjustmentReason || null},
        total_price_cents = ${total}
    WHERE id = ${queueItemId}
  `;
  await logEvent(
    queueItemId,
    "approved",
    `Waiting for the scheduled automation to send it via Flyra${addons.length ? ` | add-ons: ${addons.map((a) => a.name).join(", ")}` : ""}${adjustmentCents ? ` | adjustment: ${adjustmentCents / 100 >= 0 ? "+" : ""}${(adjustmentCents / 100).toFixed(2)} (${adjustmentReason})` : ""}`
  );
  revalidatePath("/queue");
}

// One click for every pending card that's already a confident tier+service
// match — skips anything flagged "needs review" or missing a phone number.
export async function approveAllConfident() {
  await requireSession();

  const rows = (await sql`
    SELECT id FROM queue_items
    WHERE status = 'pending' AND tier_confidence = 'CONFIDENT' AND category_confidence = 'CONFIDENT' AND phone IS NOT NULL
  `) as { id: number }[];

  for (const row of rows) {
    const [item] = (await sql`SELECT base_price_cents, travel_fee_cents FROM queue_items WHERE id = ${row.id}`) as {
      base_price_cents: number | null;
      travel_fee_cents: number;
    }[];
    const total = (item.base_price_cents ?? 0) + item.travel_fee_cents;
    await sql`UPDATE queue_items SET status = 'approved', reviewed_at = now(), total_price_cents = ${total} WHERE id = ${row.id}`;
    await logEvent(row.id, "approved", "Bulk-approved (confident match)");
  }

  revalidatePath("/queue");
}

// Per-lead on/off switch for the day-1/day-3 follow-up automation. Flips
// whatever the current value is — the checkbox's own defaultChecked in the
// UI is what the owner is actually toggling against.
export async function toggleAutoFollowup(queueItemId: number, formData: FormData) {
  await requireSession();
  const next = formData.get("enable") === "true";
  await sql`UPDATE queue_items SET auto_followup = ${next} WHERE id = ${queueItemId}`;
  await logEvent(queueItemId, "auto_followup_toggled", next ? "on" : "off");
  revalidatePath("/queue");
}
