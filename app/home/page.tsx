import { sql } from "@/lib/db";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActionItem {
  id: number;
  customer_name: string | null;
  raw_vehicle_text: string | null;
  total_price_cents: number | null;
  created_at: string;
  sent_at: string | null;
}

export default async function HomePage() {
  const [needsReview, approvedNotSent, staleSent] = await Promise.all([
    sql`
      SELECT id, customer_name, raw_vehicle_text, total_price_cents, created_at, sent_at
      FROM queue_items WHERE status = 'pending'
      ORDER BY created_at ASC LIMIT 5
    `,
    sql`
      SELECT id, customer_name, raw_vehicle_text, total_price_cents, created_at, sent_at
      FROM queue_items WHERE status = 'approved'
      ORDER BY created_at ASC LIMIT 5
    `,
    sql`
      SELECT id, customer_name, raw_vehicle_text, total_price_cents, created_at, sent_at
      FROM queue_items WHERE status = 'sent' AND sent_at < now() - interval '1 day'
      ORDER BY sent_at ASC LIMIT 5
    `,
  ]) as unknown as [ActionItem[], ActionItem[], ActionItem[]];

  const [[{ count: pendingCount }], [{ count: approvedCount }], [{ count: staleCount }]] = (await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM queue_items WHERE status = 'pending'`,
    sql`SELECT COUNT(*)::int AS count FROM queue_items WHERE status = 'approved'`,
    sql`SELECT COUNT(*)::int AS count FROM queue_items WHERE status = 'sent' AND sent_at < now() - interval '1 day'`,
  ])) as unknown as [{ count: number }[], { count: number }[], { count: number }[]];

  const totalAction = pendingCount + approvedCount + staleCount;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Header active="home" />

      <div>
        <h1 className="text-xl font-medium text-neutral-100">Home</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {totalAction === 0
            ? "Nothing needs you right now."
            : `${totalAction} thing${totalAction === 1 ? "" : "s"} need${totalAction === 1 ? "s" : ""} your attention.`}
        </p>
      </div>

      <ActionSection
        title="Needs your review"
        subtitle="Vehicle size or service hasn't been set yet."
        count={pendingCount}
        items={needsReview}
        emptyLabel="review queue"
        href="/queue"
        tone="neutral"
      />

      <ActionSection
        title="Approved, not sent yet"
        subtitle="Waiting on the next automation run."
        count={approvedCount}
        items={approvedNotSent}
        emptyLabel="approved items"
        href="/queue"
        tone="accent"
      />

      <ActionSection
        title="Sent, no response in over a day"
        subtitle="Might be worth a manual follow-up."
        count={staleCount}
        items={staleSent}
        emptyLabel="stale estimates"
        href="/log"
        tone="alert"
        useSentTime
      />
    </div>
  );
}

function ActionSection({
  title,
  subtitle,
  count,
  items,
  emptyLabel,
  href,
  tone,
  useSentTime,
}: {
  title: string;
  subtitle: string;
  count: number;
  items: ActionItem[];
  emptyLabel: string;
  href: string;
  tone: "neutral" | "accent" | "alert";
  useSentTime?: boolean;
}) {
  const badgeClass =
    tone === "alert"
      ? "bg-brand/10 text-brand"
      : tone === "accent"
        ? "bg-accent/10 text-accent"
        : "bg-neutral-800 text-neutral-300";

  return (
    <section>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[15px] font-medium text-neutral-100">{title}</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{count}</span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{subtitle}</p>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-600 bg-neutral-950 border border-neutral-900 rounded-xl px-4 py-4">
          No {emptyLabel} right now.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={href}
              className="flex items-center justify-between bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-xl px-4 py-3 transition-colors duration-150"
            >
              <div>
                <p className="text-sm text-neutral-100">{item.customer_name || "Unknown"}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{item.raw_vehicle_text || "no vehicle info"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-300">{money(item.total_price_cents)}</p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {timeAgo(useSentTime ? item.sent_at ?? item.created_at : item.created_at)}
                </p>
              </div>
            </a>
          ))}
          {count > items.length && (
            <a href={href} className="block text-xs text-accent px-4 py-1">
              +{count - items.length} more →
            </a>
          )}
        </div>
      )}
    </section>
  );
}
