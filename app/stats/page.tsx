import { sql } from "@/lib/db";
import { Header } from "@/components/Header";
import { SIZE_TIER_LABELS, SERVICE_CATEGORIES, type SizeTier } from "@/lib/priceBook";

export const dynamic = "force-dynamic";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function hoursToLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

const SENT_LIKE = ["sent", "accepted", "declined", "scheduled", "completed"];
const WON_LIKE = ["accepted", "scheduled", "completed"];

export default async function StatsPage() {
  const [weekRow] = (await sql`
    SELECT COALESCE(SUM(total_price_cents), 0)::int AS cents, COUNT(*)::int AS count
    FROM queue_items
    WHERE status = ANY(${SENT_LIKE}) AND sent_at >= now() - interval '7 days'
  `) as { cents: number; count: number }[];

  const [monthRow] = (await sql`
    SELECT COALESCE(SUM(total_price_cents), 0)::int AS cents, COUNT(*)::int AS count
    FROM queue_items
    WHERE status = ANY(${SENT_LIKE}) AND sent_at >= now() - interval '30 days'
  `) as { cents: number; count: number }[];

  const [winRow] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = ANY(${SENT_LIKE}))::int AS sent_count,
      COUNT(*) FILTER (WHERE status = ANY(${WON_LIKE}))::int AS won_count
    FROM queue_items
  `) as { sent_count: number; won_count: number }[];
  const winRate = winRow.sent_count > 0 ? Math.round((winRow.won_count / winRow.sent_count) * 100) : null;

  const [reviewRow] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE tier_confidence = 'AMBIGUOUS' OR category_confidence = 'AMBIGUOUS')::int AS ambiguous,
      COUNT(*)::int AS total
    FROM queue_items
    WHERE status != 'deleted'
  `) as { ambiguous: number; total: number }[];
  const reviewRate = reviewRow.total > 0 ? Math.round((reviewRow.ambiguous / reviewRow.total) * 100) : null;

  const [addonRow] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE jsonb_array_length(addons) > 0)::int AS with_addons,
      COUNT(*)::int AS total
    FROM queue_items
    WHERE status = ANY(${[...SENT_LIKE, "approved"]})
  `) as { with_addons: number; total: number }[];
  const addonRate = addonRow.total > 0 ? Math.round((addonRow.with_addons / addonRow.total) * 100) : null;

  const [responseRow] = (await sql`
    SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600)::float AS avg_hours
    FROM queue_items
    WHERE reviewed_at IS NOT NULL
  `) as { avg_hours: number | null }[];

  const bySize = (await sql`
    SELECT matched_tier AS tier, COALESCE(SUM(total_price_cents), 0)::int AS cents
    FROM queue_items
    WHERE status = ANY(${SENT_LIKE}) AND matched_tier IS NOT NULL
    GROUP BY matched_tier
    ORDER BY cents DESC
  `) as { tier: SizeTier; cents: number }[];

  const byService = (await sql`
    SELECT matched_category_id AS category_id, COALESCE(SUM(total_price_cents), 0)::int AS cents
    FROM queue_items
    WHERE status = ANY(${SENT_LIKE}) AND matched_category_id IS NOT NULL
    GROUP BY matched_category_id
    ORDER BY cents DESC
    LIMIT 5
  `) as { category_id: string; cents: number }[];

  const maxSizeCents = Math.max(1, ...bySize.map((r) => r.cents));
  const maxServiceCents = Math.max(1, ...byService.map((r) => r.cents));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <Header active="stats" />
      <div>
        <h1 className="text-xl font-medium text-neutral-100">Stats</h1>
        <p className="text-sm text-neutral-500 mt-1">How the pipeline&apos;s actually performing.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Quoted this week" value={money(weekRow.cents)} sub={`${weekRow.count} estimate${weekRow.count === 1 ? "" : "s"}`} />
        <StatCard label="Quoted this month" value={money(monthRow.cents)} sub={`${monthRow.count} estimate${monthRow.count === 1 ? "" : "s"}`} />
        <StatCard
          label="Win rate"
          value={winRate === null ? "—" : `${winRate}%`}
          sub={`${winRow.won_count} of ${winRow.sent_count} sent`}
        />
        <StatCard
          label="Needs manual review"
          value={reviewRate === null ? "—" : `${reviewRate}%`}
          sub="of all leads — rising means the size list needs more entries"
        />
        <StatCard
          label="Add-on attach rate"
          value={addonRate === null ? "—" : `${addonRate}%`}
          sub={`${addonRow.with_addons} of ${addonRow.total} estimates`}
        />
        <StatCard
          label="Avg. response time"
          value={responseRow.avg_hours === null ? "—" : hoursToLabel(responseRow.avg_hours)}
          sub="lead created to reviewed"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-[15px] font-medium text-neutral-100 mb-3">Revenue by vehicle size</h2>
          <div className="space-y-2.5">
            {bySize.length === 0 && <p className="text-sm text-neutral-600">No sent estimates yet.</p>}
            {bySize.map((r) => (
              <BarRow key={r.tier} label={SIZE_TIER_LABELS[r.tier]} cents={r.cents} maxCents={maxSizeCents} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[15px] font-medium text-neutral-100 mb-3">Revenue by service (top 5)</h2>
          <div className="space-y-2.5">
            {byService.length === 0 && <p className="text-sm text-neutral-600">No sent estimates yet.</p>}
            {byService.map((r) => (
              <BarRow
                key={r.category_id}
                label={SERVICE_CATEGORIES.find((c) => c.id === r.category_id)?.name ?? r.category_id}
                cents={r.cents}
                maxCents={maxServiceCents}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-medium text-neutral-100 mt-1.5">{value}</div>
      <div className="text-xs text-neutral-600 mt-1.5">{sub}</div>
    </div>
  );
}

function BarRow({ label, cents, maxCents }: { label: string; cents: number; maxCents: number }) {
  const pct = Math.max(4, Math.round((cents / maxCents) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-neutral-300 truncate">{label}</span>
        <span className="text-neutral-500 shrink-0 ml-2">{money(cents)}</span>
      </div>
      <div className="h-1.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
