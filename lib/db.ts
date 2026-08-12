import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazily construct the client so that importing this module at build time
// (e.g. Next.js collecting page data for pages that reference `sql`) doesn't
// throw just because DATABASE_URL isn't set yet in that environment. The
// error only surfaces when a query actually runs without it configured.
let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set — configure it before making database calls.");
    client = neon(url);
  }
  return client;
}

// The raw, ungated client — only initSchema/seedVehicleMapIfEmpty use this,
// so they don't deadlock waiting on the schema-ready gate they themselves
// are trying to satisfy.
const rawSql = ((...args: Parameters<NeonQueryFunction<false, false>>) =>
  getClient()(...args)) as NeonQueryFunction<false, false>;

// Every serverless instance starts with an empty connection, and Vercel
// deployments never ran a migration step — the first query against a fresh
// database would 500 with "relation does not exist" otherwise. Gate every
// query through this so the schema is guaranteed to exist, memoized so it
// only actually runs once per warm instance.
let readyPromise: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = initSchema()
      .then(() => seedVehicleMapIfEmpty())
      .then(() => seedTemplatesIfEmpty())
      .catch((err) => {
        readyPromise = null; // allow retry on next call instead of caching a failure
        throw err;
      });
  }
  return readyPromise;
}

export const sql = (async (...args: Parameters<NeonQueryFunction<false, false>>) => {
  await ensureReady();
  return getClient()(...args);
}) as unknown as NeonQueryFunction<false, false>;

export async function initSchema() {
  await rawSql`
    CREATE TABLE IF NOT EXISTS vehicle_size_map (
      id SERIAL PRIMARY KEY,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('SMALL','MEDIUM','LARGE','XL','MINI_VAN','CARGO_VAN')),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await rawSql`
    CREATE TABLE IF NOT EXISTS queue_items (
      id SERIAL PRIMARY KEY,
      flyra_lead_id TEXT NOT NULL UNIQUE,
      customer_name TEXT,
      phone TEXT,
      city TEXT,
      raw_vehicle_text TEXT,
      raw_service_text TEXT,

      matched_tier TEXT,
      tier_confidence TEXT NOT NULL CHECK (tier_confidence IN ('CONFIDENT','AMBIGUOUS')),
      tier_reason TEXT,

      matched_category_id TEXT,
      category_confidence TEXT NOT NULL CHECK (category_confidence IN ('CONFIDENT','AMBIGUOUS')),
      category_reason TEXT,

      base_price_cents INTEGER,
      travel_fee_cents INTEGER NOT NULL DEFAULT 0,
      total_price_cents INTEGER,
      zone_reason TEXT,
      far_out_of_area BOOLEAN NOT NULL DEFAULT false,

      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','missing_info','approved','sent','rejected')),
      flyra_estimate_id TEXT,
      flyra_estimate_link TEXT,
      send_attempts INTEGER NOT NULL DEFAULT 0,

      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ
    )
  `;
  await rawSql`ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS send_attempts INTEGER NOT NULL DEFAULT 0`;

  await rawSql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      queue_item_id INTEGER REFERENCES queue_items(id),
      event TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await rawSql`
    CREATE TABLE IF NOT EXISTS poll_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_checked_at TIMESTAMPTZ
    )
  `;

  await rawSql`
    CREATE TABLE IF NOT EXISTS message_templates (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

const SEED_VEHICLES: { make: string; model: string; tier: string }[] = [
  { make: "Volkswagen", model: "Beetle", tier: "SMALL" },
  { make: "Toyota", model: "Corolla", tier: "SMALL" },
  { make: "Porsche", model: "911", tier: "SMALL" },
  { make: "Chevrolet", model: "Bolt", tier: "SMALL" },
  { make: "Toyota", model: "Prius", tier: "SMALL" },
  { make: "Ferrari", model: "*", tier: "SMALL" },
  { make: "Mini", model: "Cooper", tier: "SMALL" },
  { make: "Toyota", model: "Yaris", tier: "SMALL" },

  { make: "Subaru", model: "Crosstrek", tier: "MEDIUM" },
  { make: "Toyota", model: "Tacoma", tier: "MEDIUM" },
  { make: "Tesla", model: "Model 3", tier: "MEDIUM" },
  { make: "Toyota", model: "RAV4", tier: "MEDIUM" },
  { make: "Honda", model: "CR-V", tier: "MEDIUM" },
  { make: "Subaru", model: "Outback", tier: "MEDIUM" },
  { make: "Volvo", model: "XC60", tier: "MEDIUM" },
  { make: "Audi", model: "Q5", tier: "MEDIUM" },
  { make: "Subaru", model: "Forester", tier: "MEDIUM" },
  { make: "Honda", model: "Accord", tier: "MEDIUM" },

  { make: "Toyota", model: "4Runner", tier: "LARGE" },
  { make: "Ford", model: "F150", tier: "LARGE" },
  { make: "GMC", model: "Sierra", tier: "LARGE" },
  { make: "Rivian", model: "R1S", tier: "LARGE" },
  { make: "BMW", model: "X5", tier: "LARGE" },
  { make: "Mercedes-Benz", model: "GLS", tier: "LARGE" },
  { make: "Ram", model: "1500", tier: "LARGE" },
  { make: "Ford", model: "Mustang", tier: "SMALL" },

  { make: "Toyota", model: "Highlander", tier: "XL" },
  { make: "Chevrolet", model: "Suburban", tier: "XL" },
  { make: "Ford", model: "Expedition", tier: "XL" },
  { make: "Audi", model: "Q7", tier: "XL" },
  { make: "Volvo", model: "XC90", tier: "XL" },
  { make: "Tesla", model: "Model X", tier: "XL" },
  { make: "Kia", model: "Telluride", tier: "XL" },
  { make: "Ram", model: "2500", tier: "XL" },
  { make: "Ram", model: "3500", tier: "XL" },
  { make: "Cadillac", model: "Escalade", tier: "XL" },
  { make: "Lincoln", model: "Aviator", tier: "XL" },
  { make: "Lincoln", model: "Navigator", tier: "XL" },

  { make: "Honda", model: "Odyssey", tier: "MINI_VAN" },
  { make: "Toyota", model: "Sienna", tier: "MINI_VAN" },
  { make: "Chrysler", model: "Pacifica", tier: "MINI_VAN" },
];

export async function seedVehicleMapIfEmpty() {
  const [{ count }] = await rawSql`SELECT COUNT(*)::int AS count FROM vehicle_size_map`;
  if (count > 0) return;
  for (const v of SEED_VEHICLES) {
    await rawSql`INSERT INTO vehicle_size_map (make, model, tier, notes) VALUES (${v.make}, ${v.model}, ${v.tier}, 'seeded from owner reference list')`;
  }
}

const DEFAULT_TEMPLATES: { key: string; label: string; body: string }[] = [
  {
    key: "missing_info",
    label: "Ask for vehicle info",
    body: "Hi {{firstName}}, thanks for reaching out to Entity Mobile Detailing! What vehicle (year/make/model) would you like serviced? That's the last thing we need to get you a quote.",
  },
  {
    key: "owner_notification",
    label: "Text me when a lead needs review",
    body: "New estimate to review: {{customerName}} — {{vehicle}} — {{price}}. Open the dashboard to approve.",
  },
  {
    key: "estimate_sent",
    label: "Estimate sent to customer",
    body: "Hi {{firstName}}, thanks for reaching out to Entity Mobile Detailing! Here's your estimate: {{link}}",
  },
];

export async function seedTemplatesIfEmpty() {
  const [{ count }] = await rawSql`SELECT COUNT(*)::int AS count FROM message_templates`;
  if (count > 0) return;
  for (const t of DEFAULT_TEMPLATES) {
    await rawSql`INSERT INTO message_templates (key, label, body) VALUES (${t.key}, ${t.label}, ${t.body})`;
  }
}
