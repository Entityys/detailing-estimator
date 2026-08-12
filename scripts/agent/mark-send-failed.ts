/**
 * Usage: npx tsx scripts/agent/mark-send-failed.ts <queueItemId> <reason>
 */
import { sql } from "../../lib/db";

async function main() {
  const [queueItemId, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(" ");
  if (!queueItemId) throw new Error("Usage: mark-send-failed.ts <queueItemId> <reason>");

  await sql`UPDATE queue_items SET send_attempts = send_attempts + 1 WHERE id = ${Number(queueItemId)}`;
  await sql`INSERT INTO audit_log (queue_item_id, event, detail) VALUES (${Number(queueItemId)}, 'send_failed', ${reason || null})`;
  console.log(JSON.stringify({ ok: true }));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.message || err) }));
  process.exit(1);
});
