import { sql } from "@/lib/db";
import { SIZE_TIER_LABELS, SERVICE_CATEGORIES, type SizeTier } from "@/lib/priceBook";

export const dynamic = "force-dynamic";

interface LogRow {
  id: number;
  customer_name: string | null;
  raw_vehicle_text: string | null;
  matched_tier: SizeTier | null;
  matched_category_id: string | null;
  total_price_cents: number | null;
  status: string;
  created_at: string;
  sent_at: string | null;
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_STYLE: Record<string, string> = {
  sent: "text-emerald-400",
  rejected: "text-red-400",
  pending: "text-amber-400",
  missing_info: "text-neutral-500",
};

export default async function LogPage() {
  const rows = (await sql`
    SELECT id, customer_name, raw_vehicle_text, matched_tier, matched_category_id,
           total_price_cents, status, created_at, sent_at
    FROM queue_items
    ORDER BY created_at DESC
    LIMIT 100
  `) as LogRow[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">History</h1>
        <a href="/queue" className="text-sm text-neutral-400 hover:text-neutral-200">
          Back to queue
        </a>
      </div>

      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
          >
            <div>
              <span className="text-neutral-100">{r.customer_name || "Unknown"}</span>
              <span className="text-neutral-500"> — {r.raw_vehicle_text || "no vehicle info"}</span>
              {r.matched_tier && (
                <span className="text-neutral-600">
                  {" "}
                  ({SIZE_TIER_LABELS[r.matched_tier]}
                  {r.matched_category_id
                    ? ` · ${SERVICE_CATEGORIES.find((c) => c.id === r.matched_category_id)?.name}`
                    : ""}
                  )
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-neutral-300">{money(r.total_price_cents)}</span>
              <span className={`text-xs font-medium ${STATUS_STYLE[r.status] ?? "text-neutral-500"}`}>
                {r.status}
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-neutral-500 text-sm">No history yet.</p>}
      </div>
    </div>
  );
}
