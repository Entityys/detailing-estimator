/**
 * Records that a poll pass completed, so the next run's get-poll-since.ts
 * starts from here instead of re-scanning everything.
 *
 * Usage: npx tsx scripts/agent/finish-poll.ts
 */
import { sql } from "../../lib/db";

async function main() {
  await sql`
    INSERT INTO poll_state (id, last_checked_at) VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET last_checked_at = now()
  `;
  console.log(JSON.stringify({ ok: true }));
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
