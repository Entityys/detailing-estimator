import { sql } from "@/lib/db";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Header active="stats" />
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Stats</h1>
        <p className="text-sm text-neutral-500">How the pipeline's actually performing.</p>
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
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold text-neutral-100 mt-1">{value}</div>
      <div className="text-xs text-neutral-600 mt-1">{sub}</div>
    </div>
  );
}
