/**
 * Usage: npx tsx scripts/agent/mark-sent.ts <queueItemId> <estimateId> <estimateLink>
 */
import { sql } from "../../lib/db";

async function main() {
  const [queueItemId, estimateId, link] = process.argv.slice(2);
  if (!queueItemId || !estimateId || !link) {
    throw new Error("Usage: mark-sent.ts <queueItemId> <estimateId> <estimateLink>");
  }

  await sql`
    UPDATE queue_items
    SET status = 'sent', flyra_estimate_id = ${estimateId}, flyra_estimate_link = ${link}, sent_at = now()
    WHERE id = ${Number(queueItemId)}
  `;
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${Number(queueItemId)}, 'sent', ${`Estimate ${estimateId}`})`;
  console.log(JSON.stringify({ ok: true }));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.message || err) }));
  process.exit(1);
});
