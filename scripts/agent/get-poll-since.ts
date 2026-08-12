/**
 * Prints the ISO timestamp to pass as `since` to the flyra_list_leads MCP
 * tool call, so the agent doesn't re-fetch leads it's already seen. Defaults
 * to 48 hours ago on first run.
 *
 * Usage: npx tsx scripts/agent/get-poll-since.ts
 */
import { initSchema, sql } from "../../lib/db";

async function main() {
  await initSchema();
  const rows = (await sql`SELECT last_checked_at FROM poll_state WHERE id = 1`) as {
    last_checked_at: string | null;
  }[];

  const since =
    rows[0]?.last_checked_at || new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  console.log(since);
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
