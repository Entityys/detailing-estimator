import { sql } from "@/lib/db";
import { SERVICE_CATEGORIES, SIZE_TIER_LABELS, type SizeTier } from "@/lib/priceBook";
import { approve, rejectItem, updateTierAndCategory } from "./actions";

export const dynamic = "force-dynamic";

interface QueueItem {
  id: number;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  raw_vehicle_text: string | null;
  raw_service_text: string | null;
  matched_tier: SizeTier | null;
  tier_confidence: "CONFIDENT" | "AMBIGUOUS";
  tier_reason: string | null;
  matched_category_id: string | null;
  category_confidence: "CONFIDENT" | "AMBIGUOUS";
  category_reason: string | null;
  base_price_cents: number | null;
  travel_fee_cents: number;
  total_price_cents: number | null;
  zone_reason: string | null;
  far_out_of_area: boolean;
  status: string;
  created_at: string;
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/50 text-amber-300"
      }`}
    >
      {children}
    </span>
  );
}

export default async function QueuePage() {
  const items = (await sql`
    SELECT * FROM queue_items WHERE status IN ('pending', 'approved') ORDER BY created_at DESC
  `) as QueueItem[];

  const pending = items.filter((i) => i.status === "pending");
  const approvedItems = items.filter((i) => i.status === "approved");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">Review Queue</h1>
        <nav className="text-sm text-neutral-400 space-x-4">
          <a href="/vehicles" className="hover:text-neutral-200">
            Size list
          </a>
          <a href="/log" className="hover:text-neutral-200">
            History
          </a>
        </nav>
      </div>

      {approvedItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-neutral-500">
            Approved — sending on the next automation run
          </h2>
          {approvedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-lg px-4 py-2 text-sm"
            >
              <span className="text-neutral-200">
                {item.customer_name} — {item.raw_vehicle_text}
              </span>
              <span className="text-neutral-400">{money(item.total_price_cents)}</span>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <p className="text-neutral-500 text-sm">Nothing waiting on you right now.</p>
      )}

      {pending.map((item) => {
        const canApprove = !!item.matched_tier && !!item.matched_category_id;
        const needsAttention = item.tier_confidence === "AMBIGUOUS" || item.category_confidence === "AMBIGUOUS";

        return (
          <div
            key={item.id}
            className={`rounded-xl border p-5 space-y-4 bg-neutral-900 ${
              needsAttention ? "border-amber-800" : "border-neutral-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-neutral-100">{item.customer_name || "Unknown"}</div>
                <div className="text-sm text-neutral-400">
                  {item.phone} {item.city ? `· ${item.city}` : ""}
                </div>
              </div>
              {item.far_out_of_area && <Badge ok={false}>Far out of area</Badge>}
            </div>

            <div className="text-sm space-y-1">
              <div>
                <span className="text-neutral-500">Vehicle:</span>{" "}
                <span className="text-neutral-200">{item.raw_vehicle_text || "(not provided)"}</span>
              </div>
              <div>
                <span className="text-neutral-500">Requested service:</span>{" "}
                <span className="text-neutral-200">{item.raw_service_text || "(not provided)"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Size tier</span>
                  <Badge ok={item.tier_confidence === "CONFIDENT"}>
                    {item.tier_confidence === "CONFIDENT" ? "confident" : "needs review"}
                  </Badge>
                </div>
                <div className="text-neutral-200">
                  {item.matched_tier ? SIZE_TIER_LABELS[item.matched_tier] : "Not set"}
                </div>
                <div className="text-xs text-neutral-500">{item.tier_reason}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Service</span>
                  <Badge ok={item.category_confidence === "CONFIDENT"}>
                    {item.category_confidence === "CONFIDENT" ? "confident" : "needs review"}
                  </Badge>
                </div>
                <div className="text-neutral-200">
                  {SERVICE_CATEGORIES.find((c) => c.id === item.matched_category_id)?.name || "Not set"}
                </div>
                <div className="text-xs text-neutral-500">{item.category_reason}</div>
              </div>
            </div>

            <form action={updateTierAndCategory.bind(null, item.id)} className="flex flex-wrap items-end gap-3 bg-neutral-950 border border-neutral-800 rounded-lg p-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Size tier</label>
                <select
                  name="tier"
                  defaultValue={item.matched_tier ?? ""}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-100"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {Object.entries(SIZE_TIER_LABELS).map(([tier, label]) => (
                    <option key={tier} value={tier}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Service</label>
                <select
                  name="categoryId"
                  defaultValue={item.matched_category_id ?? ""}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-100"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded"
              >
                Save
              </button>
            </form>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
              <div className="text-sm text-neutral-300 space-x-3">
                <span>Base: {money(item.base_price_cents)}</span>
                {item.travel_fee_cents > 0 && <span>+ Travel: {money(item.travel_fee_cents)}</span>}
                <span className="font-semibold text-neutral-100">
                  Total: {money(item.total_price_cents)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <form action={rejectItem.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded"
                    >
                      Reject
                    </button>
                  </form>
                  <form action={approve.bind(null, item.id)}>
                    <button
                      type="submit"
                      disabled={!canApprove}
                      className="text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-3 py-1.5 rounded font-medium"
                    >
                      Approve
                    </button>
                  </form>
                </div>
                <span className="text-xs text-neutral-600">Sends automatically within the hour</span>
              </div>
            </div>
            {item.zone_reason && (
              <div className="text-xs text-neutral-600">{item.zone_reason}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
