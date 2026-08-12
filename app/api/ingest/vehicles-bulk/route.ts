import { NextRequest, NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/ingestAuth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BulkVehicle {
  make: string;
  model: string;
  tier: "SMALL" | "MEDIUM" | "LARGE" | "XL" | "MINI_VAN" | "CARGO_VAN";
  notes?: string;
}

// One-off/admin tool for expanding the vehicle_size_map from a batch (e.g.
// real make/models pulled from Flyra history), skipping any make+model pair
// that already exists so re-running is safe.
export async function POST(req: NextRequest) {
  const authError = checkIngestAuth(req);
  if (authError) return authError;

  const { vehicles } = (await req.json()) as { vehicles: BulkVehicle[] };
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return NextResponse.json({ error: "vehicles array required" }, { status: 400 });
  }

  let inserted = 0;
  let skipped = 0;
  for (const v of vehicles) {
    if (!v.make || !v.model || !v.tier) continue;
    const existing = (await sql`
      SELECT id FROM vehicle_size_map WHERE lower(make) = lower(${v.make}) AND lower(model) = lower(${v.model})
    `) as { id: number }[];
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await sql`INSERT INTO vehicle_size_map (make, model, tier, notes) VALUES (${v.make}, ${v.model}, ${v.tier}, ${v.notes ?? null})`;
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
