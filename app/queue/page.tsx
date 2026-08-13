import { sql } from "@/lib/db";
import { SERVICE_CATEGORIES, SIZE_TIER_LABELS, ADD_ONS, type SizeTier } from "@/lib/priceBook";
import { Header } from "@/components/Header";
import { approve, rejectItem, updateTierAndCategory, deleteItem, approveAllConfident } from "./actions";

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
  flyra_estimate_link: string | null;
  sent_at: string | null;
  suggested_addon_ids: string[];
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function firstName(name: string | null): string {
  if (!name) return "Unknown";
  return name.trim().split(/\s+/)[0];
}

function initial(name: string | null): string {
  return firstName(name).charAt(0).toUpperCase() || "?";
}

function serviceName(categoryId: string | null): string {
  return SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.name || "Service not set";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const COLUMN_STYLES = {
  slate: { dot: "bg-slate-400", header: "text-slate-300", border: "border-slate-800", badge: "bg-slate-800 text-slate-300" },
  amber: { dot: "bg-amber-400", header: "text-amber-300", border: "border-amber-900/60", badge: "bg-amber-900/50 text-amber-300" },
  blue: { dot: "bg-blue-400", header: "text-blue-300", border: "border-blue-900/60", badge: "bg-blue-900/50 text-blue-300" },
  emerald: { dot: "bg-emerald-400", header: "text-emerald-300", border: "border-emerald-900/60", badge: "bg-emerald-900/50 text-emerald-300" },
} as const;

const LIFECYCLE_LABELS: Record<string, string> = {
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  scheduled: "Scheduled",
  completed: "Completed",
};

function CardShell({ color, children }: { color: keyof typeof COLUMN_STYLES; children: React.ReactNode }) {
  const s = COLUMN_STYLES[color];
  return (
    <div className={`rounded-xl border ${s.border} bg-neutral-900 p-4 space-y-3 shadow-sm shadow-black/20`}>
      {children}
    </div>
  );
}

function CardHeader({ item, color }: { item: QueueItem; color: keyof typeof COLUMN_STYLES }) {
  const s = COLUMN_STYLES[color];
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.badge} font-semibold text-sm`}>
        {initial(item.customer_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-neutral-100 truncate">{firstName(item.customer_name)}</div>
        <div className="text-sm text-neutral-300 truncate">{serviceName(item.matched_category_id)}</div>
        <div className="text-sm text-neutral-500 truncate">{item.raw_vehicle_text || "vehicle not provided"}</div>
      </div>
    </div>
  );
}

function ColumnHeader({ title, count, color }: { title: string; count: number; color: keyof typeof COLUMN_STYLES }) {
  const s = COLUMN_STYLES[color];
  return (
    <div className="flex items-center gap-2 px-1 mb-3 sticky top-0">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      <h2 className={`text-sm font-semibold ${s.header}`}>{title}</h2>
      <span className="text-xs text-neutral-600 bg-neutral-900 border border-neutral-800 rounded-full px-1.5 py-0.5">
        {count}
      </span>
    </div>
  );
}

function DeleteControl({ itemId }: { itemId: number }) {
  return (
    <form action={deleteItem.bind(null, itemId)} className="flex items-center gap-1.5 pt-1">
      <input
        name="reason"
        placeholder="reason (optional)"
        className="flex-1 min-w-0 bg-transparent border-0 text-[11px] text-neutral-600 placeholder:text-neutral-700 focus:outline-none focus:text-neutral-400"
      />
      <button type="submit" className="text-[11px] text-neutral-600 hover:text-red-400 shrink-0">
        Delete
      </button>
    </form>
  );
}

export default async function QueuePage() {
  const items = (await sql`
    SELECT * FROM queue_items
    WHERE status IN ('missing_info', 'pending', 'approved', 'sent', 'accepted', 'declined', 'scheduled', 'completed')
    ORDER BY created_at DESC
  `) as QueueItem[];

  const missingInfo = items.filter((i) => i.status === "missing_info");
  const pending = items.filter((i) => i.status === "pending");
  const approvedItems = items.filter((i) => i.status === "approved");
  const sentItems = items
    .filter((i) => ["sent", "accepted", "declined", "scheduled", "completed"].includes(i.status))
    .slice(0, 20);

  const confidentPendingCount = pending.filter(
    (i) => i.tier_confidence === "CONFIDENT" && i.category_confidence === "CONFIDENT" && i.phone
  ).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-6">
      <Header active="queue" />
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Pipeline</h1>
        <p className="text-sm text-neutral-500">Every active lead, from first text to job done.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Missing info */}
        <div className="min-w-[300px] w-[300px] shrink-0">
          <ColumnHeader title="Waiting on Customer" count={missingInfo.length} color="slate" />
          <div className="space-y-3">
            {missingInfo.length === 0 && <EmptyHint>No one's waiting on a reply.</EmptyHint>}
            {missingInfo.map((item) => (
              <CardShell key={item.id} color="slate">
                <CardHeader item={item} color="slate" />
                <div className="text-xs text-neutral-500 border-t border-neutral-800 pt-2">
                  Texted asking what they drive · {timeAgo(item.created_at)}
                </div>
                <DeleteControl itemId={item.id} />
              </CardShell>
            ))}
          </div>
        </div>

        {/* Needs review */}
        <div className="min-w-[380px] w-[380px] shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold text-amber-300">Needs Your Review</h2>
              <span className="text-xs text-neutral-600 bg-neutral-900 border border-neutral-800 rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            </div>
            {confidentPendingCount > 1 && (
              <form action={approveAllConfident}>
                <button
                  type="submit"
                  className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded"
                >
                  Approve all confident ({confidentPendingCount})
                </button>
              </form>
            )}
          </div>
          <div className="space-y-3">
            {pending.length === 0 && <EmptyHint>Nothing waiting on you right now.</EmptyHint>}
            {pending.map((item) => {
              const canApprove = !!item.matched_tier && !!item.matched_category_id;
              const needsAttention =
                item.tier_confidence === "AMBIGUOUS" || item.category_confidence === "AMBIGUOUS";
              const suggested = item.suggested_addon_ids ?? [];

              return (
                <CardShell key={item.id} color="amber">
                  <CardHeader item={item} color="amber" />
                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>{item.phone}</span>
                    {item.city && <span>· {item.city}</span>}
                    {item.far_out_of_area && (
                      <span className="text-red-400 font-medium">· far out of area</span>
                    )}
                  </div>

                  {needsAttention && (
                    <form
                      action={updateTierAndCategory.bind(null, item.id)}
                      className="flex flex-wrap items-end gap-2 bg-neutral-950 border border-amber-900/40 rounded-lg p-2.5"
                    >
                      <div className="flex-1 min-w-[100px]">
                        <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Size</label>
                        <select
                          name="tier"
                          defaultValue={item.matched_tier ?? ""}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-100"
                        >
                          <option value="" disabled>Choose…</option>
                          {Object.entries(SIZE_TIER_LABELS).map(([tier, label]) => (
                            <option key={tier} value={tier}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[130px]">
                        <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Service</label>
                        <select
                          name="categoryId"
                          defaultValue={item.matched_category_id ?? ""}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-100"
                        >
                          <option value="" disabled>Choose…</option>
                          {SERVICE_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2.5 py-1.5 rounded">
                        Save
                      </button>
                    </form>
                  )}

                  <form action={approve.bind(null, item.id)} className="space-y-2 border-t border-neutral-800 pt-2.5">
                    <details className="group">
                      <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 list-none flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                        Add-ons {suggested.length > 0 && <span className="text-amber-400">({suggested.length} suggested)</span>}
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                        {ADD_ONS.map((a) => (
                          <label key={a.id} className="flex items-center gap-2 text-xs text-neutral-300">
                            <input
                              type="checkbox"
                              name="addonIds"
                              value={a.id}
                              defaultChecked={suggested.includes(a.id)}
                              className="accent-brand"
                            />
                            {a.name}
                            <span className="text-neutral-600">+{money(a.priceCents)}</span>
                          </label>
                        ))}
                      </div>
                    </details>

                    <details className="group">
                      <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 list-none flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                        Price adjustment
                      </summary>
                      <div className="mt-2 flex gap-2">
                        <input
                          name="adjustmentDollars"
                          type="number"
                          step="0.01"
                          placeholder="+/- $"
                          className="w-24 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-100"
                        />
                        <input
                          name="adjustmentReason"
                          placeholder="reason (required if nonzero)"
                          className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-100"
                        />
                      </div>
                    </details>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-neutral-100">{money(item.total_price_cents)}</span>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          formAction={rejectItem.bind(null, item.id)}
                          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1.5 rounded"
                        >
                          Reject
                        </button>
                        <button
                          type="submit"
                          disabled={!canApprove}
                          className="text-xs bg-brand hover:bg-brand-dark disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-2.5 py-1.5 rounded font-medium"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </form>
                  <DeleteControl itemId={item.id} />
                </CardShell>
              );
            })}
          </div>
        </div>

        {/* Approved */}
        <div className="min-w-[300px] w-[300px] shrink-0">
          <ColumnHeader title="Approved" count={approvedItems.length} color="blue" />
          <div className="space-y-3">
            {approvedItems.length === 0 && <EmptyHint>Nothing queued to send.</EmptyHint>}
            {approvedItems.map((item) => (
              <CardShell key={item.id} color="blue">
                <CardHeader item={item} color="blue" />
                <div className="flex items-center justify-between border-t border-neutral-800 pt-2.5 text-sm">
                  <span className="font-semibold text-neutral-100">{money(item.total_price_cents)}</span>
                  <span className="text-xs text-neutral-500">sends within the hour</span>
                </div>
                <DeleteControl itemId={item.id} />
              </CardShell>
            ))}
          </div>
        </div>

        {/* Sent + lifecycle */}
        <div className="min-w-[300px] w-[300px] shrink-0">
          <ColumnHeader title="Sent" count={sentItems.length} color="emerald" />
          <div className="space-y-3">
            {sentItems.length === 0 && <EmptyHint>Nothing sent yet.</EmptyHint>}
            {sentItems.map((item) => (
              <CardShell key={item.id} color="emerald">
                <CardHeader item={item} color="emerald" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300">
                    {LIFECYCLE_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-800 pt-2.5 text-sm">
                  <span className="font-semibold text-neutral-100">{money(item.total_price_cents)}</span>
                  {item.flyra_estimate_link ? (
                    <a href={item.flyra_estimate_link} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300">
                      View estimate ↗
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-500">{item.sent_at ? timeAgo(item.sent_at) : ""}</span>
                  )}
                </div>
              </CardShell>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-600 px-1">{children}</p>;
}
